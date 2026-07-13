import { DECK_MAX_CARDS, DECK_MIN_CARDS, type ApiDeckCardEntry } from "#api_types/deck.types";
import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import { Button, Collapse, NumberInput, Tabs, TextInput } from "@mantine/core";
import {
    IconChevronDown,
    IconChevronUp,
    IconMinus,
    IconPlus,
    IconShare,
} from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Catalogue } from "~/components/catalogue/catalogue";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { CatalogCardHoverPreview } from "~/components/cards/catalog_card_hover_preview";
import { ManaCurveChart } from "~/components/decks/mana_curve_chart";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardSetsQuery } from "~/hooks/use_card_sets";
import { entriesToOwnedCounts, useCollectionQuery } from "~/hooks/use_collection";
import { useCardsQuery } from "~/hooks/use_cards";
import { useDeckQuery, useUpdateDeckMutation } from "~/hooks/use_decks";
import { useIsNarrowScreen } from "~/hooks/use_is_narrow_screen";
import { notifyError, notifySuccess } from "~/services/toasts";
import { ShareDeckModal } from "~/components/decks/share_deck_modal";
import { play } from "~/cuelume/index";
import { CUELUME_BUTTON, CUELUME_TOGGLE } from "~/cuelume/sound_props";
import "~/components/catalogue/catalogue_light.css";
import "./deck_builder_page.css";

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
    const [shareDeckId, setShareDeckId] = useState<number | null>(null);

    const catalog = cardsQuery.data ?? [];
    const cardSets = cardSetsQuery.data ?? [];
    const deck = deckQuery.data;

    const catalogById = useMemo(() => new Map(catalog.map((card) => [card.id, card])), [catalog]);
    const ownedCounts = useMemo(
        () => entriesToOwnedCounts(collectionQuery.data ?? []),
        [collectionQuery.data],
    );
    const activeSetIds = useMemo(() => new Set(cardSets.map((set) => set.id)), [cardSets]);

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
    const isCardCountInvalid = totalCards > DECK_MAX_CARDS || totalCards < DECK_MIN_CARDS;

    const canAddCard = (cardId: number) => {
        if (!catalogById.has(cardId)) return false;
        const card = catalogById.get(cardId)!;
        const count = currentComposition.get(cardId) ?? 0;
        const owned = ownedCounts.get(cardId) ?? 0;
        if (count >= owned) return false;
        const maxCopies = getMaxCopiesForRarity(card.rarity);
        return count < maxCopies && totalCards < DECK_MAX_CARDS;
    };

    const addCard = (cardId: number) => {
        if (!canAddCard(cardId)) return;
        play("chime");
        const next = new Map(currentComposition);
        next.set(cardId, (next.get(cardId) ?? 0) + 1);
        setComposition(next);
        if (deckName === null) setDeckName(deck.name);
    };

    const removeCard = (cardId: number) => {
        const count = currentComposition.get(cardId) ?? 0;
        if (count === 0) return;
        play("droplet");
        const next = new Map(currentComposition);
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
        play("toggle");
        setCostFilter(cost === null || costFilter === String(cost) ? null : String(cost));
    };

    const catalogPanel = (
        <Catalogue
            variant="deckBuilder"
            headerTitle={false}
            composition={currentComposition}
            canAddCard={canAddCard}
            onAdd={addCard}
            onRemove={removeCard}
            costFilter={costFilter}
            onCostFilterChange={setCostFilter}
            ownedCounts={ownedCounts}
            ownedOnly
            className="flex flex-col flex-1 min-h-0 lg:h-full"
        />
    );

    const compositionPanel = (
        <div className="deck-builder-page__composition">
            <div className="deck-builder-page__composition-header">
                <span>Composition</span>
                <span
                    className={`deck-builder-page__composition-count${isCardCountInvalid ? " deck-builder-page__composition-count--error" : ""}`}
                >
                    {totalCards}/{DECK_MAX_CARDS}
                </span>
            </div>
            <div className="deck-builder-page__composition-body">
                <div className="shrink-0">
                    {isNarrowScreen ? (
                        <>
                            <button
                                type="button"
                                className="collection-catalogue__filters-toggle"
                                onClick={() => setShowManaCurve((visible) => !visible)}
                                aria-expanded={showManaCurve}
                                {...CUELUME_TOGGLE}
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
                                    variant="light"
                                    composition={currentComposition}
                                    catalogById={catalogById}
                                    selectedCost={costFilter !== null ? Number(costFilter) : null}
                                    onCostClick={handleCostClick}
                                />
                            </Collapse>
                        </>
                    ) : (
                        <ManaCurveChart
                            variant="light"
                            composition={currentComposition}
                            catalogById={catalogById}
                            selectedCost={costFilter !== null ? Number(costFilter) : null}
                            onCostClick={handleCostClick}
                        />
                    )}
                </div>
                {compositionEntries.length === 0 ? (
                    <p className="deck-builder-page__muted">
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
                                                <p className="deck-builder-page__muted text-sm font-medium m-0 truncate">
                                                    Carte non collectionnable (#{cardId})
                                                </p>
                                                <p className="deck-builder-page__error-text">
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
                                                {...CUELUME_BUTTON}
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
                                                {...CUELUME_BUTTON}
                                            >
                                                <IconMinus size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                color="gold"
                                                onClick={() => addCard(cardId)}
                                                disabled={!canAddCard(cardId)}
                                                {...CUELUME_BUTTON}
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
        <>
            <div className="deck-builder-page">
                <div className="deck-builder-page__bg" aria-hidden="true" />
                <div className="deck-builder-page__overlay" aria-hidden="true" />

                <div className="deck-builder-page__content">
                    <div className="deck-builder-page__panel">
                        <header className="deck-builder-page__header">
                            <TextInput
                                label="Nom du deck"
                                value={currentName}
                                onChange={(e) => {
                                    setDeckName(e.currentTarget.value);
                                    if (composition === null) {
                                        setComposition(entriesToMap(deck.cards));
                                    }
                                }}
                                className="deck-builder-page__name-input"
                            />
                            <div className="deck-builder-page__actions">
                                <button
                                    type="button"
                                    className="deck-builder-page__action-btn"
                                    onClick={() => setShareDeckId(deckId)}
                                    {...CUELUME_BUTTON}
                                >
                                    <IconShare size={16} aria-hidden />
                                    Partager
                                </button>
                                <button
                                    type="button"
                                    className="deck-builder-page__action-btn"
                                    onClick={() => navigate("/decks")}
                                    {...CUELUME_BUTTON}
                                >
                                    Retour
                                </button>
                                <button
                                    type="button"
                                    className="deck-builder-page__action-btn deck-builder-page__action-btn--primary"
                                    disabled={updateMutation.isPending}
                                    onClick={() => void handleSave()}
                                    {...CUELUME_BUTTON}
                                >
                                    {updateMutation.isPending ? "Sauvegarde…" : "Sauvegarder"}
                                </button>
                            </div>
                        </header>

                        <div className="deck-builder-page__body">
                            {isNarrowScreen ? (
                                <Tabs
                                    defaultValue="catalog"
                                    variant="pills"
                                    color="navy"
                                    classNames={{
                                        root: "gg-deck-builder-tabs flex flex-1 min-h-0 flex-col overflow-hidden",
                                        panel: "gg-deck-builder-tabs__panel",
                                    }}
                                >
                                    <Tabs.List grow>
                                        <Tabs.Tab value="catalog" {...CUELUME_TOGGLE}>
                                            Catalogue
                                        </Tabs.Tab>
                                        <Tabs.Tab value="composition" {...CUELUME_TOGGLE}>
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
                            ) : (
                                <div className="deck-builder-page__grid">
                                    {catalogPanel}
                                    {compositionPanel}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ShareDeckModal deckId={shareDeckId} onClose={() => setShareDeckId(null)} />
        </>
    );
});
