import { DECK_MAX_CARDS } from "#api_types/deck.types";
import type { ApiCatalogCard } from "#api_types/deck.types";
import { Button, Stack, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { CardArtworkModal } from "~/components/cards/card_artwork_modal";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { CatalogCardHoverPreview } from "~/components/cards/catalog_card_hover_preview";
import { ManaCurveChart } from "~/components/decks/mana_curve_chart";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { useCardsQuery } from "~/hooks/use_cards";
import { entriesToOwnedCounts, useCollectionQuery } from "~/hooks/use_collection";
import {
    getDeckShareImportErrorMessage,
    useDeckShareQuery,
    useImportDeckShareMutation,
} from "~/hooks/use_deck_shares";
import { useIsNarrowScreen } from "~/hooks/use_is_narrow_screen";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";

const entriesToMap = (entries: { cardId: number; count: number }[]) => {
    const map = new Map<number, number>();
    for (const entry of entries) {
        map.set(entry.cardId, entry.count);
    }
    return map;
};

export const DeckSharePage = observer(() => {
    const { code } = useParams();
    const navigate = useNavigate();
    const user = useUser();
    const shareCode = code ?? "";

    const shareQuery = useDeckShareQuery(shareCode);
    const cardsQuery = useCardsQuery();
    const collectionQuery = useCollectionQuery({ enabled: !!user });
    const importMutation = useImportDeckShareMutation();
    const isNarrowScreen = useIsNarrowScreen();
    const [artworkCard, setArtworkCard] = useState<ApiCatalogCard | null>(null);

    const share = shareQuery.data;
    const catalog = cardsQuery.data ?? [];
    const catalogById = useMemo(() => new Map(catalog.map((card) => [card.id, card])), [catalog]);
    const ownedCounts = useMemo(
        () => entriesToOwnedCounts(collectionQuery.data ?? []),
        [collectionQuery.data],
    );

    if (!shareCode) {
        return <Navigate to="/decks" />;
    }

    if (shareQuery.isLoading || cardsQuery.isLoading || (user && collectionQuery.isLoading)) {
        return <CenteredLoader absolute />;
    }

    if (shareQuery.isError || !share) {
        return (
            <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                <p className="text-white/80 m-0">Deck partagé introuvable.</p>
            </div>
        );
    }

    const composition = entriesToMap(share.cards);
    const missingCards = share.cards.flatMap((entry) => {
        const owned = ownedCounts.get(entry.cardId) ?? 0;
        const missing = entry.count - owned;
        if (missing <= 0) {
            return [];
        }

        return [{ cardId: entry.cardId, count: missing }];
    });
    const ownedCardCount = share.cards.reduce((sum, entry) => {
        const owned = ownedCounts.get(entry.cardId) ?? 0;
        return sum + Math.min(entry.count, owned);
    }, 0);
    const isPartialImport = missingCards.length > 0;
    const canImport = !!user && share.valid && ownedCardCount > 0;

    const handleImport = async () => {
        try {
            const result = await importMutation.mutateAsync(share.code);
            const importedCount = result.deck.cardCount;
            notifySuccess(
                result.missingCards.length > 0
                    ? `Deck importé partiellement (${importedCount}/${share.cardCount} cartes)`
                    : "Deck importé",
            );
            navigate(`/decks/${result.deck.id}`);
        } catch (error) {
            const message = getDeckShareImportErrorMessage(error);
            notifyError(message ?? "Impossible d'importer ce deck");
        }
    };

    const compositionEntries = [...composition.entries()].sort(([cardIdA], [cardIdB]) => {
        const cardA = catalogById.get(cardIdA);
        const cardB = catalogById.get(cardIdB);
        const costA = cardA?.cost ?? 0;
        const costB = cardB?.cost ?? 0;
        if (costA !== costB) return costA - costB;
        return (cardA?.label ?? "").localeCompare(cardB?.label ?? "");
    });

    return (
        <div className="max-w-5xl mx-auto w-full min-w-0 flex flex-col gap-6 overflow-x-clip">
                <div className="gg-panel p-4 sm:p-6 min-w-0 overflow-hidden">
                    <Stack gap="sm">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white m-0">{share.name}</h1>
                                <Text size="sm" c="dimmed" mt={4}>
                                    Par{" "}
                                    <PlayerNameLink
                                        pseudo={share.authorPseudo}
                                        userId={share.authorUserId}
                                        className="text-white/80 hover:text-white"
                                    />
                                </Text>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={clsx(
                                        "gg-badge",
                                        share.valid ? "gg-badge--valid" : "gg-badge--invalid",
                                    )}
                                >
                                    {share.valid ? "Valide" : "Invalide"}
                                </span>
                                <span className="gg-badge">
                                    {share.cardCount}/{DECK_MAX_CARDS} cartes
                                </span>
                            </div>
                        </div>

                        {!share.valid && share.compositionErrors.length > 0 && (
                            <Text size="sm" c="red.4">
                                {share.compositionErrors[0]}
                            </Text>
                        )}

                        {user ? (
                            <div className="flex flex-col sm:flex-row gap-2 pt-2 min-w-0">
                                <Button
                                    className="gg-btn-primary w-full sm:w-auto whitespace-normal h-auto"
                                    leftSection={<IconDownload size={16} />}
                                    loading={importMutation.isPending}
                                    disabled={!canImport}
                                    onClick={handleImport}
                                >
                                    {isPartialImport
                                        ? `Importer partiellement (${ownedCardCount}/${share.cardCount} cartes)`
                                        : "Importer dans mes decks"}
                                </Button>
                                {!share.valid && (
                                    <Text size="sm" c="dimmed" className="self-center">
                                        Ce deck n'est pas valide et ne peut pas être importé.
                                    </Text>
                                )}
                                {share.valid && ownedCardCount === 0 && (
                                    <Text size="sm" c="dimmed" className="self-center">
                                        Vous ne possédez aucune carte de ce deck.
                                    </Text>
                                )}
                                {share.valid && isPartialImport && (
                                    <Text size="sm" c="dimmed" className="self-center">
                                        Seules les cartes que vous possédez seront importées. Le
                                        deck ne sera pas jouable en l'état.
                                    </Text>
                                )}
                            </div>
                        ) : (
                            <Text size="sm" c="dimmed">
                                <Link to="/login" className="text-gg-gold hover:underline">
                                    Connectez-vous
                                </Link>{" "}
                                pour importer ce deck.
                            </Text>
                        )}
                    </Stack>
                </div>

                <div className="gg-panel p-4 min-w-0 overflow-hidden">
                    <ManaCurveChart
                        composition={composition}
                        catalogById={catalogById}
                        selectedCost={null}
                        onCostClick={() => {}}
                    />
                </div>

                <div className="gg-panel p-4 min-w-0 overflow-hidden">
                    <h2 className="text-lg font-semibold text-white m-0 mb-4">Composition</h2>
                    {compositionEntries.length === 0 ? (
                        <Text size="sm" c="dimmed">
                            Ce deck est vide.
                        </Text>
                    ) : (
                        <div
                            className={clsx(
                                "gg-catalog-grid",
                                isNarrowScreen && "gg-catalog-grid--list",
                            )}
                        >
                            {compositionEntries.map(([cardId, count]) => {
                                const card = catalogById.get(cardId);
                                if (!card) return null;

                                const owned = ownedCounts.get(cardId) ?? 0;
                                const isMissing = user ? owned < count : false;

                                if (isNarrowScreen) {
                                    return (
                                        <div
                                            key={cardId}
                                            className={clsx(
                                                "gg-composition-row",
                                                isMissing && "gg-composition-row--unowned",
                                            )}
                                        >
                                            <div className="gg-composition-row__thumb-wrap">
                                                <CatalogCardHoverPreview card={card}>
                                                    <div className="gg-composition-row__thumb card-composition">
                                                        <CatalogCardDisplay
                                                            card={card}
                                                            variant="artwork"
                                                        />
                                                    </div>
                                                </CatalogCardHoverPreview>
                                                <span className="gg-catalog-card-slot__count">
                                                    x{count}
                                                </span>
                                            </div>
                                            <div className="gg-composition-row__actions">
                                                <p className="text-white text-sm font-medium m-0 truncate">
                                                    {card.label}
                                                </p>
                                                {isMissing && (
                                                    <span className="gg-composition-row__warning">
                                                        Manque {count - owned}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={cardId}
                                        className={clsx(
                                            "gg-catalog-card-slot",
                                            isMissing && "gg-catalog-card-slot--unowned",
                                        )}
                                    >
                                        <div
                                            className="gg-catalog-card-slot__preview"
                                            onClick={() => setArtworkCard(card)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setArtworkCard(card);
                                                }
                                            }}
                                        >
                                            <CatalogCardDisplay card={card} />
                                        </div>
                                        <span className="gg-catalog-card-slot__count">
                                            x{count}
                                        </span>
                                        {isMissing && (
                                            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[3] gg-badge gg-badge--invalid text-[10px] whitespace-nowrap">
                                                Manque {count - owned}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <CardArtworkModal
                    card={artworkCard}
                    opened={artworkCard !== null}
                    onClose={() => setArtworkCard(null)}
                />
            </div>
    );
});
