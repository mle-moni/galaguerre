import { Button, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ManaCurveChart } from "~/components/decks/mana_curve_chart";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardsQuery } from "~/hooks/use_cards";
import { useDecksQuery } from "~/hooks/use_decks";
import { useUser } from "~/hooks/use_user";
import { privateAxios } from "~/services/axios";
import { applyTrainingGameStarted } from "~/services/apply_training_game_started";

export const OnboardingPage = observer(() => {
    const user = useUser()!;
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

    if (user.currentGameId) return <Navigate to="/play" replace />;

    if (decksQuery.isLoading || cardsQuery.isLoading) return <CenteredLoader absolute />;

    const selectedDeck = decksQuery.data?.find((d) => d.selected);
    const catalogById = new Map((cardsQuery.data ?? []).map((c) => [c.id, c]));

    const deckComposition = new Map(
        (selectedDeck?.cards ?? []).map(({ cardId, count }) => [cardId, count] as const),
    );

    const canStart = selectedDeck?.valid ?? false;
    const displayName = user.pseudo ?? user.email.split("@")[0];

    return (
        <div className="max-w-lg mx-auto">
                <div className="gg-panel">
                    <div className="gg-panel-header">Bienvenue dans l&apos;arène</div>
                    <div className="gg-panel-body flex flex-col gap-4">
                        <Text className="text-white font-semibold text-lg m-0">
                            Bienvenue, {displayName} !
                        </Text>

                        <Text className="text-white/80 m-0" size="sm">
                            Galaguerre est un jeu de cartes en duel : réduisez les points de vie de
                            l&apos;adversaire à 0. Chaque tour, votre mana augmente, vous jouez des
                            cartes, attaquez, puis passez votre tour.
                        </Text>

                        {selectedDeck ? (
                            <>
                                <div>
                                    <Text className="text-white font-semibold mb-1">
                                        Votre deck de départ : {selectedDeck.name}
                                    </Text>
                                    <Text size="sm" className="text-white/60">
                                        {selectedDeck.cardCount} cartes — prêt à jouer
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
                                    to={`/decks/${selectedDeck.id}`}
                                    className="text-gg-gold text-sm font-medium no-underline hover:underline"
                                >
                                    Explorer mon deck →
                                </Link>
                            </>
                        ) : (
                            <Text className="text-white/80">
                                Aucun deck trouvé.{" "}
                                <Link to="/decks" className="text-gg-gold">
                                    Créez un deck
                                </Link>{" "}
                                pour commencer.
                            </Text>
                        )}

                        {!canStart && selectedDeck && (
                            <Text size="sm" className="text-red-300">
                                Votre deck doit être valide pour lancer une partie.
                            </Text>
                        )}

                        <Text className="text-white/70 m-0" size="sm">
                            Pour votre première partie, affrontez l&apos;IA en entraînement — sans
                            impact sur votre Elo.
                        </Text>

                        <Button
                            className="gg-btn-primary w-full"
                            size="md"
                            disabled={!canStart}
                            loading={startMutation.isPending}
                            onClick={() => startMutation.mutate()}
                        >
                            Lancer ma première partie
                        </Button>

                        <Link
                            to="/"
                            className="text-center text-white/60 text-sm no-underline hover:text-white/80"
                        >
                            Passer pour l&apos;instant
                        </Link>

                        <Link
                            to="/rules"
                            className="text-center text-gg-gold text-sm no-underline hover:underline"
                        >
                            Lire les règles avant de jouer
                        </Link>
                    </div>
                </div>
            </div>
    );
});
