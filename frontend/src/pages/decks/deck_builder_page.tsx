import type { ApiCatalogCard, ApiDeckCardEntry } from "#api_types/deck.types";
import { Button, NumberInput, Select, TextInput } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardsQuery } from "~/hooks/use_cards";
import { useDeckQuery, useUpdateDeckMutation } from "~/hooks/use_decks";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";

const DECK_MAX_CARDS = 20;
const DECK_MAX_COPIES = 2;

type CardTypeFilter = "ALL" | "MINION" | "SPELL" | "WEAPON";

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
    const updateMutation = useUpdateDeckMutation();

    const [deckName, setDeckName] = useState<string | null>(null);
    const [composition, setComposition] = useState<Map<number, number> | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<CardTypeFilter>("ALL");
    const [costFilter, setCostFilter] = useState<string | null>(null);

    const catalog = cardsQuery.data ?? [];
    const deck = deckQuery.data;

    const catalogById = useMemo(() => new Map(catalog.map((card) => [card.id, card])), [catalog]);

    if (!user) return <Navigate to="/login" />;
    if (!deckId || Number.isNaN(deckId)) return <Navigate to="/decks" />;
    if (deckQuery.isLoading || cardsQuery.isLoading) return <CenteredLoader absolute />;
    if (!deck) return <Navigate to="/decks" />;

    const currentName = deckName ?? deck.name;
    const currentComposition = composition ?? entriesToMap(deck.cards);
    const totalCards = getTotalCards(currentComposition);

    const filteredCatalog = catalog.filter((card) => {
        if (search && !card.label.toLowerCase().includes(search.toLowerCase())) return false;
        if (typeFilter !== "ALL" && card.type !== typeFilter) return false;
        if (costFilter !== null && card.cost !== Number(costFilter)) return false;
        return true;
    });

    const canAddCard = (cardId: number) => {
        const count = currentComposition.get(cardId) ?? 0;
        return count < DECK_MAX_COPIES && totalCards < DECK_MAX_CARDS;
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

    const costOptions = [
        { value: "", label: "Tous les coûts" },
        ...Array.from(new Set(catalog.map((c) => c.cost)))
            .sort((a, b) => a - b)
            .map((cost) => ({ value: String(cost), label: `${cost} mana` })),
    ];

    return (
        <AppLayout title="Éditeur de deck" backTo="/decks" backLabel="Mes decks">
            <div className="max-w-7xl mx-auto flex flex-col gap-4">
                <div className="flex flex-wrap gap-3 items-end justify-between">
                    <TextInput
                        label="Nom du deck"
                        value={currentName}
                        onChange={(e) => {
                            setDeckName(e.currentTarget.value);
                            if (composition === null) setComposition(entriesToMap(deck.cards));
                        }}
                        className="flex-1 min-w-[200px]"
                        styles={{ label: { color: "#1e3a5f", fontWeight: 600 } }}
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" color="navy" onClick={() => navigate("/decks")}>
                            Retour
                        </Button>
                        <Button
                            className="gg-btn-primary"
                            loading={updateMutation.isPending}
                            onClick={handleSave}
                        >
                            Sauvegarder
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 gg-panel">
                        <div className="gg-panel-header">Catalogue</div>
                        <div className="gg-panel-body">
                            <div className="flex flex-wrap gap-3 mb-4">
                                <TextInput
                                    placeholder="Rechercher une carte..."
                                    value={search}
                                    onChange={(e) => setSearch(e.currentTarget.value)}
                                    className="flex-1 min-w-[180px]"
                                />
                                <Select
                                    value={typeFilter}
                                    onChange={(v) => setTypeFilter((v as CardTypeFilter) ?? "ALL")}
                                    data={[
                                        { value: "ALL", label: "Tous types" },
                                        { value: "MINION", label: "Serviteurs" },
                                        { value: "SPELL", label: "Sorts" },
                                        { value: "WEAPON", label: "Armes" },
                                    ]}
                                    className="w-[140px]"
                                />
                                <Select
                                    value={costFilter ?? ""}
                                    onChange={(v) => setCostFilter(v || null)}
                                    data={costOptions}
                                    className="w-[140px]"
                                />
                            </div>
                            <div className="gg-catalog-grid">
                                {filteredCatalog.length === 0 ? (
                                    <p className="text-white/50 text-sm m-0 w-full text-center py-8">
                                        Aucune carte ne correspond à vos filtres.
                                    </p>
                                ) : (
                                    filteredCatalog.map((card) => (
                                        <CatalogCardItem
                                            key={card.id}
                                            card={card}
                                            count={currentComposition.get(card.id) ?? 0}
                                            canAdd={canAddCard(card.id)}
                                            onAdd={() => addCard(card.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="gg-panel">
                        <div className="gg-panel-header flex justify-between items-center">
                            <span>Composition</span>
                            <span
                                className={`text-sm font-normal ${totalCards > DECK_MAX_CARDS ? "text-red-400" : "text-white/70"}`}
                            >
                                {totalCards}/{DECK_MAX_CARDS}
                            </span>
                        </div>
                        <div className="gg-panel-body">
                            {compositionEntries.length === 0 ? (
                                <p className="text-white/60 text-sm m-0">
                                    Cliquez sur des cartes du catalogue pour les ajouter.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                                    {compositionEntries.map(([cardId, count]) => {
                                        const card = catalogById.get(cardId);
                                        if (!card) return null;
                                        return (
                                            <div key={cardId} className="gg-composition-row">
                                                <div className="gg-composition-row__thumb">
                                                    <CatalogCardDisplay
                                                        card={card}
                                                        showDetailOnHover
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium m-0 truncate">
                                                        {card.label}
                                                    </p>
                                                    <p className="text-white/50 text-xs m-0">
                                                        {card.cost} mana
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
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
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        color="gold"
                                                        onClick={() => addCard(cardId)}
                                                        disabled={!canAddCard(cardId)}
                                                    >
                                                        <IconPlus size={12} />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
});

interface CatalogCardItemProps {
    card: ApiCatalogCard;
    count: number;
    canAdd: boolean;
    onAdd: () => void;
}

const CatalogCardItem = ({ card, count, canAdd, onAdd }: CatalogCardItemProps) => (
    <div
        className={`gg-catalog-card-slot ${canAdd ? "gg-catalog-card-slot--interactive" : "gg-catalog-card-slot--disabled"}`}
        onClick={canAdd ? onAdd : undefined}
        role={canAdd ? "button" : undefined}
        tabIndex={canAdd ? 0 : undefined}
        onKeyDown={
            canAdd
                ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onAdd();
                      }
                  }
                : undefined
        }
    >
        <CatalogCardDisplay card={card} showDetailOnHover />
        {count > 0 && <span className="gg-catalog-card-slot__count">{count}</span>}
    </div>
);
