import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { play } from "~/cuelume/index";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { LEADERBOARD_QUERY_KEY, AI_SPEEDRUN_LEADERBOARD_QUERY_KEY } from "~/hooks/use_leaderboard";
import { PACKS_QUERY_KEY } from "~/hooks/use_collection";
import { useOnboardingGame } from "~/hooks/use_onboarding_game";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { client } from "~/services/client";
import { clearCurrentGameId } from "~/services/clear_current_game_id";
import { startGameSearch } from "~/services/matchmaking";
import { queryClient } from "~/services/query_client";
import {
    formatGameDuration,
    formatGameSpeedrunDuration,
    getGameFinishedAt,
} from "~/helpers/format_game_duration";
import type { ApiUser } from "#api_types/auth.types";
import { GameFinalStatsTable } from "./game_final_stats_table.tsx";
import { GameLootSection } from "./game_loot_section.tsx";

const formatEloDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

export const GameFinalScreen = observer(() => {
    const { store } = useGameContext();
    const navigate = useNavigate();
    const isMobilePortrait = useIsMobilePortrait();
    const isOnboardingGame = useOnboardingGame();
    const isTraining = store.game.data.isTraining ?? false;
    const isFriendly = store.game.data.isFriendly ?? false;
    const ButtonsLayout = isMobilePortrait ? Stack : Group;

    const invalidatePostGameQueries = (options?: { includeUser?: boolean }) => {
        if (options?.includeUser !== false) {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        }
        if (isFriendly) return;
        queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: LEADERBOARD_QUERY_KEY });
        if (isTraining && store.isUserWinner) {
            queryClient.invalidateQueries({ queryKey: AI_SPEEDRUN_LEADERBOARD_QUERY_KEY });
        }
    };

    const leaveFinishedGame = (options?: { includeUser?: boolean }) => {
        clearCurrentGameId(queryClient, store.game.id);
        invalidatePostGameQueries(options);
    };

    const startTrainingMutation = useApiMutation({
        mutationFn: async () => {
            return (await client.api.games.training({})) as { gameId: number };
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
                if (!oldUser) return oldUser;
                return { ...oldUser, currentGameId: data.gameId };
            });
            void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            navigate("/play");
        },
    });

    const replaySearchMutation = useApiMutation({
        mutationFn: startGameSearch,
        onSuccess: (data) => {
            if (!data.searchSessionId) {
                void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
                return;
            }

            queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
                if (!oldUser) return oldUser;
                return { ...oldUser, matchmakingSearchSessionId: data.searchSessionId ?? null };
            });
            void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            navigate("/matchmaking");
        },
    });

    const handleClose = () => {
        if (store.isSpectating) {
            navigate("/friends");
            return;
        }

        leaveFinishedGame();
        navigate(isFriendly ? "/friends" : isTraining ? "/" : "/matchmaking");
    };

    const handleReadRules = () => {
        navigate("/rules");
    };

    const handleReplay = () => {
        void queryClient.cancelQueries({ queryKey: USER_QUERY_KEY });
        leaveFinishedGame({ includeUser: false });

        if (isTraining) {
            startTrainingMutation.mutate();
            return;
        }

        replaySearchMutation.mutate();
    };

    const ratingResult = store.game.data.ratingResult;
    const isDraw = store.p1.health <= 0 && store.p2.health <= 0;
    const userRating =
        store.me.userId === store.p1.userId ? ratingResult?.playerOne : ratingResult?.playerTwo;

    const userReward =
        store.me.userId === store.p1.userId
            ? store.game.data.rewardResult?.playerOne
            : store.game.data.rewardResult?.playerTwo;

    const userXp =
        store.me.userId === store.p1.userId
            ? store.game.data.xpResult?.playerOne.xp ?? 0
            : store.game.data.xpResult?.playerTwo.xp ?? 0;

    useEffect(() => {
        if (!store.showFinalScreen || store.isSpectating) return;
        play(store.isUserWinner ? "success" : "droplet");
    }, [store.showFinalScreen, store.isUserWinner, store.isSpectating]);

    return (
        <Modal
            centered={!isMobilePortrait}
            fullScreen={isMobilePortrait}
            opened={store.showFinalScreen}
            onClose={handleClose}
            closeOnClickOutside={false}
            title={
                store.isSpectating
                    ? "Partie terminée"
                    : `Partie terminée - ${store.isUserWinner ? "Victoire" : "Défaite"}`
            }
            size="lg"
        >
            <Stack gap="sm">
                {isOnboardingGame && !store.isSpectating && !isFriendly ? (
                    <Text size="sm">
                        Vous connaissez les bases ! En classé, vous gagnez ou perdez de l&apos;Elo.
                        Votre deck de départ est déjà actif.
                    </Text>
                ) : null}

                {store.isSpectating ? (
                    <Text size="sm" c="dimmed">
                        Mode spectateur
                    </Text>
                ) : isTraining ? (
                    <Text size="sm" c="dimmed">
                        Partie d'entraînement — Elo et XP inchangés
                    </Text>
                ) : isFriendly ? (
                    <Text size="sm" c="dimmed">
                        Match amical — aucune progression
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
                    {isTraining
                        ? formatGameSpeedrunDuration(
                              store.game.createdAt,
                              getGameFinishedAt(store.game),
                          )
                        : formatGameDuration(store.game.createdAt, getGameFinishedAt(store.game))}
                </Text>

                <GameFinalStatsTable
                    me={store.me}
                    opponent={store.opponent}
                    winnerUserId={store.winnerUserId}
                />

                {!store.isSpectating && !isFriendly && userReward ? (
                    <GameLootSection reward={userReward} xp={userXp} />
                ) : null}

                {store.isSpectating || isFriendly ? (
                    <Button onClick={handleClose} mt="sm">
                        Retour aux amis
                    </Button>
                ) : isOnboardingGame ? (
                    <Stack gap="sm" mt="sm" align="center">
                        <ButtonsLayout gap="sm" w={isMobilePortrait ? "100%" : undefined}>
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
                            <Button variant="subtle" onClick={handleReadRules}>
                                Relire les règles
                            </Button>
                        </ButtonsLayout>
                    </Stack>
                ) : (
                    <ButtonsLayout gap="sm" mt="sm" w={isMobilePortrait ? "100%" : undefined}>
                        <Button
                            onClick={handleReplay}
                            loading={
                                startTrainingMutation.isPending || replaySearchMutation.isPending
                            }
                        >
                            Rejouer
                        </Button>
                        <Button variant="default" onClick={handleClose}>
                            {isTraining ? "Retour à l'accueil" : "Retour au matchmaking"}
                        </Button>
                    </ButtonsLayout>
                )}
            </Stack>
        </Modal>
    );
});
