import {
    CARD_RARITY_LABELS,
    type CardRarity,
    getGoldCoinsPerDuplicateSell,
    getMaxCopiesForRarity,
} from "#api_types/card_rarity.types";
import { COLLECTION_MIN_CARDS } from "#api_types/collection.types";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconBuildingStore, IconScale } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Catalogue } from "~/components/catalogue/catalogue";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { CenteredLoader } from "~/components/centered_loader";
import {
    entriesToOwnedCounts,
    useBuyCardMutation,
    useCollectionQuery,
    useDuplicatesPreviewQuery,
    usePacksQuery,
    useSellCardMutation,
    useSellDuplicatesMutation,
} from "~/hooks/use_collection";
import { useCardsQuery } from "~/hooks/use_cards";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";
import "./collection_page.css";
import "~/components/catalogue/catalogue_light.css";

const SELL_MODAL_RARITIES: CardRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export const CollectionPage = observer(() => {
    const user = useUser()!;
    const collectionQuery = useCollectionQuery();
    const packsQuery = usePacksQuery();
    const cardsQuery = useCardsQuery({ includeNonCollectible: true });
    const sellDuplicatesMutation = useSellDuplicatesMutation();
    const buyCardMutation = useBuyCardMutation();
    const sellCardMutation = useSellCardMutation();
    const [showOwnedOnly, setShowOwnedOnly] = useState(true);
    const [sellModalOpened, setSellModalOpened] = useState(false);
    const [buyingCardId, setBuyingCardId] = useState<number | null>(null);
    const [sellingCardId, setSellingCardId] = useState<number | null>(null);

    const duplicatesPreviewQuery = useDuplicatesPreviewQuery(sellModalOpened);

    const ownedCounts = useMemo(
        () => entriesToOwnedCounts(collectionQuery.data ?? []),
        [collectionQuery.data],
    );

    const catalogById = useMemo(
        () => new Map((cardsQuery.data ?? []).map((card) => [card.id, card])),
        [cardsQuery.data],
    );

    const totalCollection = useMemo(
        () => [...ownedCounts.values()].reduce((sum, count) => sum + count, 0),
        [ownedCounts],
    );

    const canBuyCard = useCallback(
        (cardId: number) => {
            if (!user) return false;

            const card = catalogById.get(cardId);
            if (!card || !card.isCollectible) return false;

            const owned = ownedCounts.get(cardId) ?? 0;
            const maxCopies = getMaxCopiesForRarity(card.rarity);
            if (owned >= maxCopies) return false;

            return true;
        },
        [user, catalogById, ownedCounts],
    );

    const canSellCard = useCallback(
        (cardId: number) => {
            if (!user) return false;

            const owned = ownedCounts.get(cardId) ?? 0;
            if (owned <= 0) return false;
            if (totalCollection <= COLLECTION_MIN_CARDS) return false;

            return true;
        },
        [user, ownedCounts, totalCollection],
    );

    const handleBuyCard = async (cardId: number) => {
        setBuyingCardId(cardId);
        try {
            await buyCardMutation.mutateAsync(cardId);
            notifySuccess("Carte achetée !");
        } catch {
            notifyError("Impossible d'acheter cette carte");
        } finally {
            setBuyingCardId(null);
        }
    };

    const handleSellCard = async (cardId: number) => {
        setSellingCardId(cardId);
        try {
            await sellCardMutation.mutateAsync(cardId);
            notifySuccess("Carte vendue !");
        } catch {
            notifyError("Impossible de vendre cette carte");
        } finally {
            setSellingCardId(null);
        }
    };

    const handleSellDuplicates = async () => {
        const earned = duplicatesPreview?.totalGoldCoins ?? 0;
        try {
            await sellDuplicatesMutation.mutateAsync();
            notifySuccess(`Doublons vendus : +${earned} story points`);
            setSellModalOpened(false);
        } catch {
            notifyError("Impossible de vendre les doublons");
        }
    };

    if (collectionQuery.isLoading || packsQuery.isLoading || cardsQuery.isLoading) {
        return <CenteredLoader absolute />;
    }

    const unopenedCount = packsQuery.data?.unopenedCount ?? 0;
    const duplicatesPreview = duplicatesPreviewQuery.data;
    const hasDuplicates = (duplicatesPreview?.totalGoldCoins ?? 0) > 0;

    return (
        <>
            <div className="collection-page">
                <div className="collection-page__bg" aria-hidden="true" />
                <div className="collection-page__overlay" aria-hidden="true" />

                <div className="collection-page__content">
                    <div className="collection-page__panel">
                        <header className="collection-page__header">
                            <h1 className="collection-page__title">Ma collection</h1>
                            <div className="collection-page__actions">
                                <button
                                    type="button"
                                    className="collection-page__action-btn"
                                    onClick={() => setSellModalOpened(true)}
                                >
                                    <IconScale size={16} aria-hidden />
                                    Vendre les doublons
                                </button>
                                <Link to="/collection/shop" className="collection-page__action-btn">
                                    <IconBuildingStore size={16} aria-hidden />
                                    Boutique
                                </Link>
                                <Link
                                    to="/collection/packs"
                                    className="collection-page__action-btn collection-page__action-btn--primary"
                                    aria-disabled={unopenedCount === 0}
                                    onClick={(e) => {
                                        if (unopenedCount === 0) e.preventDefault();
                                    }}
                                    style={
                                        unopenedCount === 0
                                            ? { pointerEvents: "none", opacity: 0.45 }
                                            : undefined
                                    }
                                >
                                    <PackIcon width={18} />
                                    Ouvrir des paquets ({unopenedCount})
                                </Link>
                            </div>
                        </header>

                        <Catalogue
                            variant="collection"
                            headerTitle={false}
                            includeNonCollectible
                            ownedCounts={ownedCounts}
                            showOwnedOnly={showOwnedOnly}
                            onShowOwnedOnlyChange={setShowOwnedOnly}
                            canBuyCard={canBuyCard}
                            onBuyCard={handleBuyCard}
                            buyingCardId={buyingCardId}
                            canSellCard={canSellCard}
                            onSellCard={handleSellCard}
                            sellingCardId={sellingCardId}
                            userGoldCoins={user.goldCoins}
                            className="collection-catalogue"
                        />
                    </div>
                </div>
            </div>

            <Modal
                opened={sellModalOpened}
                onClose={() => setSellModalOpened(false)}
                title="Vendre les doublons"
                centered
            >
                <Stack gap="md">
                    <Text size="sm">
                        Un doublon est un exemplaire au-delà du maximum utilisable en deck :{" "}
                        <strong>2 exemplaires</strong> pour une carte commune rare ou épique,{" "}
                        <strong>1 exemplaire</strong> pour une carte légendaire.
                    </Text>
                    <Text size="sm">La vente est irréversible. Chaque doublon rapporte :</Text>
                    <Stack gap={4}>
                        {SELL_MODAL_RARITIES.map((rarity) => (
                            <Group key={rarity} justify="space-between" wrap="nowrap">
                                <Text size="sm">{CARD_RARITY_LABELS[rarity]}</Text>
                                <GoldCoinAmount
                                    amount={getGoldCoinsPerDuplicateSell(rarity)}
                                    iconSize={16}
                                />
                            </Group>
                        ))}
                    </Stack>

                    {duplicatesPreviewQuery.isLoading ? (
                        <CenteredLoader />
                    ) : duplicatesPreview && duplicatesPreview.lines.length > 0 ? (
                        <Stack gap="xs">
                            <Text size="sm" fw={600}>
                                Détail des doublons à vendre
                            </Text>
                            {duplicatesPreview.lines.map((line) => (
                                <Group key={line.cardId} justify="space-between" wrap="nowrap">
                                    <Text size="sm">
                                        {line.cardLabel} ({CARD_RARITY_LABELS[line.rarity]}) ×
                                        {line.excessCount}
                                    </Text>
                                    <GoldCoinAmount
                                        amount={line.goldCoinsTotal}
                                        showLabel={false}
                                        iconSize={16}
                                    />
                                </Group>
                            ))}
                        </Stack>
                    ) : (
                        <Text size="sm" c="dimmed">
                            Vous n&apos;avez aucun doublon à vendre pour le moment.
                        </Text>
                    )}

                    <Group justify="space-between" align="center">
                        <Text size="sm" fw={600}>
                            Total à recevoir
                        </Text>
                        <GoldCoinAmount
                            amount={duplicatesPreview?.totalGoldCoins ?? 0}
                            showLabel={false}
                            iconSize={20}
                        />
                    </Group>

                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setSellModalOpened(false)}>
                            Annuler
                        </Button>
                        <Button
                            className="gg-btn-primary"
                            onClick={handleSellDuplicates}
                            loading={sellDuplicatesMutation.isPending}
                            disabled={!hasDuplicates}
                        >
                            Confirmer la vente
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
});
