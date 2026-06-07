import { Button, Modal, Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import { useGameContext } from "~/hooks/use_game_state";
import { LEADERBOARD_QUERY_KEY } from "~/hooks/use_leaderboard";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { queryClient } from "~/services/query_client";
import { GameFinalStatsTable } from "./game_final_stats_table.tsx";

const formatEloDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

export const GameFinalScreen = observer(() => {
    const { store } = useGameContext();
    const navigate = useNavigate();
    const isTraining = store.game.data.isTraining ?? false;

    const handleClose = () => {
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: LEADERBOARD_QUERY_KEY });
        navigate(isTraining ? "/" : "/matchmaking");
    };

    const ratingResult = store.game.data.ratingResult;
    const isDraw = store.p1.health <= 0 && store.p2.health <= 0;
    const userRating =
        store.me.userId === store.p1.userId ? ratingResult?.playerOne : ratingResult?.playerTwo;

    return (
        <Modal
            centered
            opened={store.isFinished}
            onClose={handleClose}
            title={`Partie terminée - ${store.isUserWinner ? "Victoire" : "Défaite"}`}
            size="lg"
        >
            <Stack gap="sm">
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
                    Partie terminée au tour {store.game.data.currentRound}
                </Text>

                <GameFinalStatsTable
                    me={store.me}
                    opponent={store.opponent}
                    winnerUserId={store.winner.userId}
                />

                <Button onClick={handleClose} mt="sm">
                    {isTraining ? "Retour à l'accueil" : "Retour au matchmaking"}
                </Button>
            </Stack>
        </Modal>
    );
});
