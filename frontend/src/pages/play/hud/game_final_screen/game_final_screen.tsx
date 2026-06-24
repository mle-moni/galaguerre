import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Link, useNavigate } from "react-router-dom";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { LEADERBOARD_QUERY_KEY, AI_SPEEDRUN_LEADERBOARD_QUERY_KEY } from "~/hooks/use_leaderboard";
import { useMatchmaking } from "~/hooks/use_matchmaking";
import { useOnboardingGame } from "~/hooks/use_onboarding_game";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { privateAxios } from "~/services/axios";
import { queryClient } from "~/services/query_client";
import { formatGameDuration, getGameFinishedAt } from "~/helpers/format_game_duration";
import type { ApiUser } from "#api_types/auth.types";
import { GameFinalStatsTable } from "./game_final_stats_table.tsx";

const formatEloDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

export const GameFinalScreen = observer(() => {
    const { store } = useGameContext();
    const navigate = useNavigate();
    const isMobilePortrait = useIsMobilePortrait();
    const isOnboardingGame = useOnboardingGame();
    const { startSearch, isStarting: isStartingSearch } = useMatchmaking();
    const isTraining = store.game.data.isTraining ?? false;

    const invalidatePostGameQueries = () => {
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: LEADERBOARD_QUERY_KEY });
        if (isTraining && store.isUserWinner) {
            queryClient.invalidateQueries({ queryKey: AI_SPEEDRUN_LEADERBOARD_QUERY_KEY });
        }
    };

    const startTrainingMutation = useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post<{ gameId: number }>("/api/games/training");
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
                if (!oldUser) return oldUser;
                return { ...oldUser, currentGameId: data.gameId };
            });
            navigate("/play");
        },
    });

    const handleClose = () => {
        invalidatePostGameQueries();
        navigate(isTraining ? "/" : "/matchmaking");
    };

    const handleReplay = () => {
        invalidatePostGameQueries();

        if (isTraining) {
            startTrainingMutation.mutate();
            return;
        }

        startSearch();
        navigate("/matchmaking");
    };

    const handleStartRanked = () => {
        invalidatePostGameQueries();
        startSearch();
        navigate("/matchmaking");
    };

    const ratingResult = store.game.data.ratingResult;
    const isDraw = store.p1.health <= 0 && store.p2.health <= 0;
    const userRating =
        store.me.userId === store.p1.userId ? ratingResult?.playerOne : ratingResult?.playerTwo;

    return (
        <Modal
            centered={!isMobilePortrait}
            fullScreen={isMobilePortrait}
            opened={store.showFinalScreen}
            onClose={handleClose}
            closeOnClickOutside={false}
            title={`Partie terminée - ${store.isUserWinner ? "Victoire" : "Défaite"}`}
            size="lg"
        >
            <Stack gap="sm">
                {isOnboardingGame ? (
                    <Text size="sm">
                        Vous connaissez les bases ! En classé, vous gagnez ou perdez de l&apos;Elo.
                        Votre deck de départ est déjà actif.
                    </Text>
                ) : null}

                {isTraining ? (
                    <Text size="sm" c="dimmed">
                        Partie d'entraînement — Elo inchangé
                    </Text>
                ) : isDraw ? (
                    <Text size="sm" c="dimmed">
                        Match nul — Elo inchangé
                    </Text>
                ) : userRating ? (
                    <Text size="sm" c="dimmed">
                        {formatEloDelta(userRating.delta)} Elo — vous êtes maintenant à{" "}
                        {userRating.eloAfter}
                    </Text>
                ) : null}

                <Text size="sm" c="dimmed">
                    Partie terminée au tour {store.game.data.currentRound} — Durée :{" "}
                    {formatGameDuration(store.game.createdAt, getGameFinishedAt(store.game))}
                </Text>

                <GameFinalStatsTable
                    me={store.me}
                    opponent={store.opponent}
                    winnerUserId={store.winner.userId}
                />

                {isOnboardingGame ? (
                    <Stack gap="sm" mt="sm">
                        <Button
                            onClick={handleStartRanked}
                            loading={isStartingSearch}
                            fullWidth={isMobilePortrait}
                        >
                            Affronter un vrai joueur
                        </Button>
                        <Group grow={isMobilePortrait}>
                            <Button
                                variant="default"
                                onClick={handleReplay}
                                loading={startTrainingMutation.isPending}
                            >
                                Rejouer contre l&apos;IA
                            </Button>
                            <Button variant="subtle" onClick={handleClose}>
                                Retour à l&apos;accueil
                            </Button>
                        </Group>
                        <Text size="sm" ta="center">
                            <Link to="/rules" className="text-gg-gold">
                                Relire les règles
                            </Link>
                        </Text>
                    </Stack>
                ) : (
                    <Group mt="sm" grow={isMobilePortrait}>
                        <Button
                            onClick={handleReplay}
                            loading={startTrainingMutation.isPending || isStartingSearch}
                        >
                            Rejouer
                        </Button>
                        <Button variant="default" onClick={handleClose}>
                            {isTraining ? "Retour à l'accueil" : "Retour au matchmaking"}
                        </Button>
                    </Group>
                )}
            </Stack>
        </Modal>
    );
});
