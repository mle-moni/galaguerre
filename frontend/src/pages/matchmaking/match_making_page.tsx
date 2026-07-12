import { Loader } from "@mantine/core";
import { IconArrowsExchange, IconSwords } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ManaCurveChart } from "~/components/decks/mana_curve_chart";
import { CenteredLoader } from "~/components/centered_loader";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { useCardsQuery } from "~/hooks/use_cards";
import { useDecksQuery } from "~/hooks/use_decks";
import { useMatchmaking } from "~/hooks/use_matchmaking";
import { useUser } from "~/hooks/use_user";
import { applyTrainingGameStarted } from "~/services/apply_training_game_started";
import { client } from "~/services/client";
import { getDeckFeaturedCard } from "~/utils/get_deck_featured_card";
import { CUELUME_BUTTON } from "~/cuelume/sound_props";
import "./match_making_page.css";

const DECK_PLACEHOLDER_IMAGE = "/card-covers/galadrim/question_mark.webp";
const SEARCH_COMPASS_IMAGE = "/game/boussole.webp";

export const MatchmakingPage = observer(() => {
    const user = useUser()!;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isSearching, startSearch, isStarting } = useMatchmaking();
    const decksQuery = useDecksQuery();
    const cardsQuery = useCardsQuery();

    const startTrainingMutation = useApiMutation({
        mutationFn: async () => {
            return (await client.api.games.training({})) as { gameId: number };
        },
        onSuccess: (data) => {
            applyTrainingGameStarted(queryClient, data.gameId);
            navigate("/play");
        },
    });

    if (user.currentGameId) return <Navigate to="/play" />;

    if (decksQuery.isLoading || cardsQuery.isLoading) return <CenteredLoader absolute />;

    const selectedDeck = decksQuery.data?.find((d) => d.selected);
    const catalogById = new Map((cardsQuery.data ?? []).map((c) => [c.id, c]));

    const deckComposition = new Map(
        (selectedDeck?.cards ?? []).map(({ cardId, count }) => [cardId, count] as const),
    );

    const featuredCard = getDeckFeaturedCard(deckComposition, catalogById);
    const canSearch = selectedDeck?.valid ?? false;

    return (
        <div className="matchmaking-page">
            <div className="matchmaking-page__bg" aria-hidden="true" />
            <div className="matchmaking-page__overlay" aria-hidden="true" />

            <div className="matchmaking-page__content">
                <div className="matchmaking-panel">
                    <div className="matchmaking-panel__header">Rechercher une partie</div>

                    <div className="matchmaking-panel__body">
                        <div className="matchmaking-panel__section">
                            {selectedDeck ? (
                                <div className="matchmaking-deck">
                                    <div className="matchmaking-deck__portrait">
                                        <img
                                            src={featuredCard?.imageUrl ?? DECK_PLACEHOLDER_IMAGE}
                                            alt={
                                                featuredCard
                                                    ? `Artwork de ${featuredCard.label}`
                                                    : "Aucune carte"
                                            }
                                        />
                                    </div>

                                    <div className="matchmaking-deck__info">
                                        <p className="matchmaking-deck__label">Deck sélectionné</p>
                                        <p className="matchmaking-deck__name">
                                            {selectedDeck.name}
                                        </p>
                                        <p className="matchmaking-deck__count">
                                            {selectedDeck.cardCount} cartes
                                            {!selectedDeck.valid && " — deck invalide"}
                                        </p>
                                    </div>

                                    <Link to="/decks" className="matchmaking-deck__change">
                                        <IconArrowsExchange size={16} />
                                        Changer de deck
                                    </Link>
                                </div>
                            ) : (
                                <p className="matchmaking-panel__empty">
                                    Vous n&apos;avez pas de deck sélectionné.{" "}
                                    <Link to="/decks">Choisissez un deck</Link> pour jouer.
                                </p>
                            )}
                        </div>

                        {selectedDeck && selectedDeck.cardCount > 0 && (
                            <div className="matchmaking-panel__section">
                                <h2 className="matchmaking-panel__section-title">Courbe de mana</h2>
                                <div className="pointer-events-none">
                                    <ManaCurveChart
                                        composition={deckComposition}
                                        catalogById={catalogById}
                                        selectedCost={null}
                                        onCostClick={() => {}}
                                        variant="light"
                                        averageLayout="side"
                                    />
                                </div>
                            </div>
                        )}

                        {!canSearch && selectedDeck && (
                            <p className="matchmaking-panel__error">
                                {selectedDeck.compositionErrors[0] ??
                                    "Votre deck doit être valide et contenir exactement 30 cartes."}
                            </p>
                        )}

                        <div className="matchmaking-panel__section">
                            {!isSearching ? (
                                <div className="matchmaking-actions">
                                    <button
                                        type="button"
                                        className="matchmaking-actions__btn matchmaking-actions__btn--search"
                                        disabled={!canSearch || isStarting}
                                        onClick={() => startSearch()}
                                        {...CUELUME_BUTTON}
                                    >
                                        {isStarting ? (
                                            <Loader size={18} color="white" />
                                        ) : (
                                            <img
                                                src={SEARCH_COMPASS_IMAGE}
                                                alt=""
                                                className="matchmaking-actions__icon"
                                                draggable={false}
                                            />
                                        )}
                                        Rechercher une partie
                                    </button>
                                    <button
                                        type="button"
                                        className="matchmaking-actions__btn matchmaking-actions__btn--training"
                                        disabled={!canSearch || startTrainingMutation.isPending}
                                        onClick={() => startTrainingMutation.mutate()}
                                        {...CUELUME_BUTTON}
                                    >
                                        {startTrainingMutation.isPending ? (
                                            <Loader size={18} color="#2c2416" />
                                        ) : (
                                            <IconSwords size={20} />
                                        )}
                                        Jouer contre l&apos;IA
                                    </button>
                                </div>
                            ) : (
                                <div className="matchmaking-searching">
                                    <CenteredLoader />
                                    <p className="matchmaking-searching__title">
                                        Recherche en cours...
                                    </p>
                                    <p className="matchmaking-searching__hint">
                                        Vous pouvez naviguer ailleurs pendant la recherche
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
