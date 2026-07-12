import { Button, Modal, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CenteredLoader } from "~/components/centered_loader";
import { ShareDeckModal } from "~/components/decks/share_deck_modal";
import { useCardsQuery } from "~/hooks/use_cards";
import {
    useCreateDeckMutation,
    useDecksQuery,
    useDeleteDeckMutation,
    useSelectDeckMutation,
} from "~/hooks/use_decks";
import { DeckListItem } from "./components/deck_list_item";
import { DecksSidebar } from "./components/decks_sidebar";
import { CUELUME_BUTTON, CUELUME_TOGGLE } from "~/cuelume/sound_props";
import "./decks_page.css";

export const DecksPage = observer(() => {
    const navigate = useNavigate();
    const decksQuery = useDecksQuery();
    const cardsQuery = useCardsQuery();
    const createMutation = useCreateDeckMutation();
    const deleteMutation = useDeleteDeckMutation();
    const selectMutation = useSelectDeckMutation();
    const [deckToDelete, setDeckToDelete] = useState<number | null>(null);
    const [deckToShare, setDeckToShare] = useState<number | null>(null);
    const [deckNameFilter, setDeckNameFilter] = useState("");
    const [cardNameFilter, setCardNameFilter] = useState("");

    const catalogById = useMemo(
        () => new Map((cardsQuery.data ?? []).map((card) => [card.id, card])),
        [cardsQuery.data],
    );

    if (decksQuery.isLoading || cardsQuery.isLoading) return <CenteredLoader absolute />;

    const decks = decksQuery.data ?? [];
    const normalizedDeckNameFilter = deckNameFilter.trim().toLowerCase();
    const normalizedCardNameFilter = cardNameFilter.trim().toLowerCase();

    const filteredDecks = decks
        .filter((deck) => {
            const matchesDeckName =
                !normalizedDeckNameFilter ||
                deck.name.toLowerCase().includes(normalizedDeckNameFilter);

            const matchesCardName =
                !normalizedCardNameFilter ||
                deck.cards.some(({ cardId }) =>
                    catalogById.get(cardId)?.label.toLowerCase().includes(normalizedCardNameFilter),
                );

            return matchesDeckName && matchesCardName;
        })
        .sort((a, b) => {
            if (a.selected !== b.selected) return a.selected ? -1 : 1;
            return 0;
        });

    const activeDeck = decks.find((deck) => deck.selected);
    const totalCards = decks.reduce((sum, deck) => sum + deck.cardCount, 0);

    const handleCreate = async () => {
        const deck = await createMutation.mutateAsync();
        navigate(`/decks/${deck.id}`);
    };

    const handleDelete = async () => {
        if (deckToDelete === null) return;
        await deleteMutation.mutateAsync(deckToDelete);
        setDeckToDelete(null);
    };

    const handleResetFilters = () => {
        setDeckNameFilter("");
        setCardNameFilter("");
    };

    return (
        <>
            <div className="decks-page">
                <div className="decks-page__bg" aria-hidden="true" />
                <div className="decks-page__overlay" aria-hidden="true" />

                <div className="decks-page__content">
                    <header className="decks-page__header">
                        <div className="decks-page__header-spacer" />
                        <div className="decks-page__title-wrap">
                            <span className="decks-page__title-line" aria-hidden="true" />
                            <h1 className="decks-page__title">Mes Decks</h1>
                            <span className="decks-page__title-line" aria-hidden="true" />
                        </div>
                        <button
                            type="button"
                            className="decks-page__new-btn"
                            disabled={createMutation.isPending}
                            onClick={() => void handleCreate()}
                            {...CUELUME_BUTTON}
                        >
                            <IconPlus size={16} />
                            Nouveau deck
                        </button>
                    </header>

                    <div className="decks-page__body">
                        <DecksSidebar
                            deckCount={decks.length}
                            activeDeckName={activeDeck?.name ?? null}
                            totalCards={totalCards}
                            deckNameFilter={deckNameFilter}
                            cardNameFilter={cardNameFilter}
                            onDeckNameFilterChange={setDeckNameFilter}
                            onCardNameFilterChange={setCardNameFilter}
                            onResetFilters={handleResetFilters}
                        />

                        {decks.length === 0 ? (
                            <div className="decks-page__empty">
                                <p>
                                    Vous n&apos;avez pas encore de deck. Créez-en un pour commencer
                                    à jouer.
                                </p>
                                <button
                                    type="button"
                                    className="decks-page__new-btn"
                                    disabled={createMutation.isPending}
                                    onClick={() => void handleCreate()}
                                    {...CUELUME_BUTTON}
                                >
                                    <IconPlus size={16} />
                                    Créer mon premier deck
                                </button>
                            </div>
                        ) : (
                            <div className="decks-page__list">
                                {filteredDecks.length === 0 ? (
                                    <div className="decks-page__empty">
                                        <p>Aucun deck ne correspond à vos filtres.</p>
                                        <button
                                            type="button"
                                            className="decks-page__new-btn"
                                            onClick={handleResetFilters}
                                            {...CUELUME_TOGGLE}
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    </div>
                                ) : (
                                    filteredDecks.map((deck) => (
                                        <DeckListItem
                                            key={deck.id}
                                            deck={deck}
                                            catalogById={catalogById}
                                            canDelete={decks.length > 1}
                                            isSelecting={selectMutation.isPending}
                                            onSelect={() => selectMutation.mutate(deck.id)}
                                            onShare={() => setDeckToShare(deck.id)}
                                            onDelete={() => setDeckToDelete(deck.id)}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                opened={deckToDelete !== null}
                onClose={() => setDeckToDelete(null)}
                title="Supprimer ce deck ?"
                centered
            >
                <Text size="sm" mb="lg">
                    Cette action est irréversible.
                </Text>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="default"
                        onClick={() => setDeckToDelete(null)}
                        {...CUELUME_TOGGLE}
                    >
                        Annuler
                    </Button>
                    <Button
                        color="red"
                        loading={deleteMutation.isPending}
                        onClick={handleDelete}
                        {...CUELUME_BUTTON}
                    >
                        Supprimer
                    </Button>
                </div>
            </Modal>

            <ShareDeckModal deckId={deckToShare} onClose={() => setDeckToShare(null)} />
        </>
    );
});
