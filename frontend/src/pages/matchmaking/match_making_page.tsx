import { Button, Text } from "@mantine/core";
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

    const canSearch = selectedDeck?.valid ?? false;

    return (
        <div className="max-w-lg mx-auto">
            <div className="gg-panel">
                <div className="gg-panel-header">Rechercher une partie</div>
                <div className="gg-panel-body flex flex-col gap-4">
                    {selectedDeck ? (
                        <>
                            <div>
                                <Text className="text-white font-semibold mb-1">
                                    Deck sélectionné : {selectedDeck.name}
                                </Text>
                                <Text size="sm" className="text-white/60">
                                    {selectedDeck.cardCount} cartes
                                    {!selectedDeck.valid && " — deck invalide"}
                                </Text>
                            </div>

                            {selectedDeck.cardCount > 0 && (
                                <div className="pointer-events-none">
                                    <ManaCurveChart
                                        composition={deckComposition}
                                        catalogById={catalogById}
                                        selectedCost={null}
                                        onCostClick={() => {}}
                                    />
                                </div>
                            )}

                            <Link
                                to="/decks"
                                className="text-gg-gold text-sm font-medium no-underline hover:underline"
                            >
                                Changer de deck →
                            </Link>
                        </>
                    ) : (
                        <Text className="text-white/80">
                            Vous n'avez pas de deck sélectionné.{" "}
                            <Link to="/decks" className="text-gg-gold">
                                Choisissez un deck
                            </Link>{" "}
                            pour jouer.
                        </Text>
                    )}

                    {!canSearch && selectedDeck && (
                        <Text size="sm" className="text-red-300">
                            {selectedDeck.compositionErrors[0] ??
                                "Votre deck doit être valide et contenir exactement 30 cartes."}
                        </Text>
                    )}

                    {!isSearching ? (
                        <div className="flex flex-col gap-3">
                            <Button
                                className="gg-btn-primary w-full sm:w-auto"
                                size="md"
                                disabled={!canSearch}
                                loading={isStarting}
                                onClick={() => startSearch()}
                            >
                                Rechercher une partie
                            </Button>
                            <Button
                                className="gg-btn-secondary w-full sm:w-auto"
                                size="md"
                                disabled={!canSearch}
                                loading={startTrainingMutation.isPending}
                                onClick={() => startTrainingMutation.mutate()}
                            >
                                Jouer contre l&apos;IA
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <CenteredLoader />
                            <Text className="text-white mt-4">Recherche en cours...</Text>
                            <Text size="sm" className="text-white/60 mt-1">
                                Vous pouvez naviguer ailleurs pendant la recherche
                            </Text>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
