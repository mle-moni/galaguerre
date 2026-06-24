import {
    DECK_MAX_CARDS,
    DECK_MAX_COPIES_PER_CARD,
    DECK_MIN_CARDS,
    type ApiDeckCardEntry,
} from "#api_types/deck.types";
import { Button, Collapse, NumberInput, Tabs, TextInput } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconMinus, IconPlus } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Catalogue } from "~/components/catalogue/catalogue";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { CatalogCardHoverPreview } from "~/components/cards/catalog_card_hover_preview";
import { ManaCurveChart } from "~/components/decks/mana_curve_chart";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardSetsQuery } from "~/hooks/use_card_sets";
import { entriesToOwnedCounts, useCollectionQuery } from "~/hooks/use_collection";
import { useCardsQuery } from "~/hooks/use_cards";
import { useDeckQuery, useUpdateDeckMutation } from "~/hooks/use_decks";
import { useIsNarrowScreen } from "~/hooks/use_is_narrow_screen";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";

const entriesToMap = (entries: ApiDeckCardEntry[]) => {
    const map = new Map<number, number>();
    for (const entry of entries) {
        map.set(entry.cardId, entry.count);
    }
    return map;
};

const mapToEntries = (map: Map<number, number>): ApiDeckCardEntry[] =>
    [...map.entries()].map(([cardId, count]) => ({ cardId, count }));

const getTotalCards = (map: Map<number, number>) =>
    [...map.values()].reduce((sum, count) => sum + count, 0);

export const DeckBuilderPage = observer(() => {
    const user = useUser();
    const navigate = useNavigate();
    const { id } = useParams();
    const deckId = Number(id);

    const deckQuery = useDeckQuery(deckId);
    const cardsQuery = useCardsQuery();
    const collectionQuery = useCollectionQuery();
    const cardSetsQuery = useCardSetsQuery();
    const updateMutation = useUpdateDeckMutation();
    const isNarrowScreen = useIsNarrowScreen();

    const [deckName, setDeckName] = useState<string | null>(null);
    const [composition, setComposition] = useState<Map<number, number> | null>(null);
    const [costFilter, setCostFilter] = useState<string | null>(null);
    const [showManaCurve, setShowManaCurve] = useState(false);

    const catalog = cardsQuery.data ?? [];
    const cardSets = cardSetsQuery.data ?? [];
    const deck = deckQuery.data;

    const catalogById = useMemo(() => new Map(catalog.map((card) => [card.id, card])), [catalog]);
    const ownedCounts = useMemo(
        () => entriesToOwnedCounts(collectionQuery.data ?? []),
        [collectionQuery.data],
    );
    const activeSetIds = useMemo(() => new Set(cardSets.map((set) => set.id)), [cardSets]);

    if (!user) return <Navigate to="/login" />;
    if (!deckId || Number.isNaN(deckId)) return <Navigate to="/decks" />;
    if (
        deckQuery.isLoading ||
        cardsQuery.isLoading ||
        collectionQuery.isLoading ||
        cardSetsQuery.isLoading
    ) {
        return <CenteredLoader absolute />;
    }
    if (!deck) return <Navigate to="/decks" />;

    const currentName = deckName ?? deck.name;
    const currentComposition = composition ?? entriesToMap(deck.cards);
    const totalCards = getTotalCards(currentComposition);

    const canAddCard = (cardId: number) => {
        if (!catalogById.has(cardId)) return false;
        const count = currentComposition.get(cardId) ?? 0;
        const owned = ownedCounts.get(cardId) ?? 0;
        if (count >= owned) return false;
        return count < DECK_MAX_COPIES_PER_CARD && totalCards < DECK_MAX_CARDS;
    };

    const addCard = (cardId: number) => {
        if (!canAddCard(cardId)) return;
        const next = new Map(currentComposition);
        next.set(cardId, (next.get(cardId) ?? 0) + 1);
        setComposition(next);
        if (deckName === null) setDeckName(deck.name);
    };

    const removeCard = (cardId: number) => {
        const next = new Map(currentComposition);
        const count = next.get(cardId) ?? 0;
        if (count <= 1) {
            next.delete(cardId);
        } else {
            next.set(cardId, count - 1);
        }
        setComposition(next);
        if (deckName === null) setDeckName(deck.name);
    };

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({
                deckId,
                payload: {
                    name: currentName,
                    cards: mapToEntries(currentComposition),
                },
            });
            setComposition(null);
            setDeckName(null);
            notifySuccess("Deck sauvegardé");
        } catch {
            notifyError("Impossible de sauvegarder le deck");
        }
    };

    const compositionEntries = [...currentComposition.entries()].sort(([aId], [bId]) => {
        const a = catalogById.get(aId);
        const b = catalogById.get(bId);
        if (!a || !b) return 0;
        return a.cost - b.cost || a.label.localeCompare(b.label);
    });

    const handleCostClick = (cost: number | null) => {
        setCostFilter(cost === null || costFilter === String(cost) ? null : String(cost));
    };

    const catalogPanel = (
        <Catalogue
            composition={currentComposition}
            canAddCard={canAddCard}
            onAdd={addCard}
            onRemove={removeCard}
            costFilter={costFilter}
            onCostFilterChange={setCostFilter}
            ownedCounts={ownedCounts}
            ownedOnly
            className="lg:col-span-2 flex flex-col flex-1 min-h-0 lg:h-full"
        />
    );

    const compositionPanel = (
        <div className="gg-panel flex flex-col flex-1 min-h-0 lg:h-full overflow-hidden">
            <div className="gg-panel-header shrink-0 flex justify-between items-center">
                <span>Composition</span>
                <span
                    className={`text-sm font-normal ${totalCards > DECK_MAX_CARDS || totalCards < DECK_MIN_CARDS ? "text-red-400" : "text-white/70"}`}
                >
                    {totalCards}/{DECK_MAX_CARDS}
                </span>
            </div>
            <div className="gg-panel-body flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="shrink-0">
                    {isNarrowScreen ? (
                        <>
                            <button
                                type="button"
                                className="gg-mana-curve-toggle"
                                onClick={() => setShowManaCurve((visible) => !visible)}
                                aria-expanded={showManaCurve}
                            >
                                <span>Courbe de mana</span>
                                {showManaCurve ? (
                                    <IconChevronUp size={16} aria-hidden />
                                ) : (
                                    <IconChevronDown size={16} aria-hidden />
                                )}
                            </button>
                            <Collapse in={showManaCurve}>
                                <ManaCurveChart
                                    composition={currentComposition}
                                    catalogById={catalogById}
                                    selectedCost={costFilter !== null ? Number(costFilter) : null}
                                    onCostClick={handleCostClick}
                                />
                            </Collapse>
                        </>
                    ) : (
                        <ManaCurveChart
                            composition={currentComposition}
                            catalogById={catalogById}
                            selectedCost={costFilter !== null ? Number(costFilter) : null}
                            onCostClick={handleCostClick}
                        />
                    )}
                </div>
                {compositionEntries.length === 0 ? (
                    <p className="text-white/60 text-sm m-0">
                        Cliquez sur + pour ajouter une carte, ou sur une carte pour voir
                        l&apos;illustration.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
                        {compositionEntries.map(([cardId, count]) => {
                            const card = catalogById.get(cardId);
                            if (!card) {
                                return (
                                    <div key={cardId} className="gg-composition-row">
                                        <div className="gg-composition-row__actions">
                                            <div className="flex-1 min-w-0 w-full text-center">
                                                <p className="text-white text-sm font-medium m-0 truncate">
                                                    Carte non collectionnable (#{cardId})
                                                </p>
                                                <p className="text-red-300 text-xs m-0">
                                                    Cette carte ne peut pas figurer dans un deck
                                                </p>
                                            </div>
                                        </div>
                                        <div className="gg-composition-row__controls">
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                color="gold"
                                                onClick={() => removeCard(cardId)}
                                            >
                                                <IconMinus size={12} />
                                            </Button>
                                            <NumberInput
                                                value={count}
                                                readOnly
                                                hideControls
                                                className="w-12"
                                                styles={{ input: { textAlign: "center" } }}
                                            />
                                        </div>
                                    </div>
                                );
                            }
                            const isInactiveSet = !activeSetIds.has(card.cardSetId);
                            return (
                                <div key={cardId} className="gg-composition-row">
                                    <div className="gg-composition-row__thumb-wrap">
                                        <CatalogCardHoverPreview card={card}>
                                            <div className="gg-composition-row__thumb card-composition">
                                                <CatalogCardDisplay card={card} variant="artwork" />
                                            </div>
                                        </CatalogCardHoverPreview>
                                        <span className="gg-catalog-card-slot__count">{count}</span>
                                    </div>
                                    <div className="gg-composition-row__actions">
                                        {isInactiveSet && (
                                            <span className="gg-composition-row__warning">
                                                Set inactif
                                            </span>
                                        )}
                                        <div className="gg-composition-row__controls">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                color="gold"
                                                onClick={() => removeCard(cardId)}
                                            >
                                                <IconMinus size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                color="gold"
                                                onClick={() => addCard(cardId)}
                                                disabled={!canAddCard(cardId)}
                                            >
                                                <IconPlus size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <AppLayout title="Éditeur de deck" backTo="/decks" backLabel="Mes decks" fillViewport>
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end justify-between shrink-0">
                    <TextInput
                        label="Nom du deck"
                        value={currentName}
                        onChange={(e) => {
                            setDeckName(e.currentTarget.value);
                            if (composition === null) setComposition(entriesToMap(deck.cards));
                        }}
                        className="w-full sm:flex-1 sm:min-w-[200px]"
                        styles={{ label: { color: "#1e3a5f", fontWeight: 600 } }}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            color="navy"
                            className="w-full sm:w-auto"
                            onClick={() => navigate("/decks")}
                        >
                            Retour
                        </Button>
                        <Button
                            className="gg-btn-primary w-full sm:w-auto"
                            loading={updateMutation.isPending}
                            onClick={handleSave}
                        >
                            Sauvegarder
                        </Button>
                    </div>
                </div>

                {isNarrowScreen ? (
                    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                        <Tabs
                            defaultValue="catalog"
                            variant="pills"
                            color="navy"
                            classNames={{
                                root: "gg-deck-builder-tabs",
                                panel: "gg-deck-builder-tabs__panel",
                            }}
                        >
                            <Tabs.List grow>
                                <Tabs.Tab value="catalog">Catalogue</Tabs.Tab>
                                <Tabs.Tab value="composition">
                                    Composition ({totalCards}/{DECK_MAX_CARDS})
                                </Tabs.Tab>
                            </Tabs.List>
                            <Tabs.Panel value="catalog" pt="sm">
                                {catalogPanel}
                            </Tabs.Panel>
                            <Tabs.Panel value="composition" pt="sm">
                                {compositionPanel}
                            </Tabs.Panel>
                        </Tabs>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch flex-1 min-h-0 overflow-hidden">
                        {catalogPanel}
                        {compositionPanel}
                    </div>
                )}
            </div>
        </AppLayout>
    );
});
