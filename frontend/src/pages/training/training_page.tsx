import { Button, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ManaCurveChart } from "~/components/decks/mana_curve_chart";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardsQuery } from "~/hooks/use_cards";
import { useDecksQuery } from "~/hooks/use_decks";
import { useUser } from "~/hooks/use_user";
import { privateAxios } from "~/services/axios";
import { applyTrainingGameStarted } from "~/services/apply_training_game_started";

export const TrainingPage = observer(() => {
    const user = useUser();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const decksQuery = useDecksQuery();
    const cardsQuery = useCardsQuery();

    const startMutation = useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post<{ gameId: number }>("/api/games/training");
            return response.data;
        },
        onSuccess: (data) => {
            applyTrainingGameStarted(queryClient, data.gameId);
            navigate("/play");
        },
    });

    if (!user) return <Navigate to="/login" />;
    if (user.currentGameId) return <Navigate to="/play" />;

    if (decksQuery.isLoading || cardsQuery.isLoading) return <CenteredLoader absolute />;

    const selectedDeck = decksQuery.data?.find((d) => d.selected);
    const catalogById = new Map((cardsQuery.data ?? []).map((c) => [c.id, c]));

    const deckComposition = new Map(
        (selectedDeck?.cards ?? []).map(({ cardId, count }) => [cardId, count] as const),
    );

    const canStart = selectedDeck?.valid ?? false;

    return (
        <AppLayout title="Entraînement" backTo="/" backLabel="Accueil">
            <div className="max-w-lg mx-auto">
                <div className="gg-panel">
                    <div className="gg-panel-header">Partie d'entraînement</div>
                    <div className="gg-panel-body flex flex-col gap-4">
                        <Text className="text-white/80" size="sm">
                            Affrontez une IA avec un deck fixe de serviteurs. L'Elo n'est pas
                            impacté.
                        </Text>

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

                        {!canStart && selectedDeck && (
                            <Text size="sm" className="text-red-300">
                                Votre deck doit être valide et contenir exactement 30 cartes.
                            </Text>
                        )}

                        <Button
                            className="gg-btn-primary w-full sm:w-auto"
                            size="md"
                            disabled={!canStart}
                            loading={startMutation.isPending}
                            onClick={() => startMutation.mutate()}
                        >
                            Lancer une partie d'entraînement
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
});
