import { Button, Modal, Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { queryClient } from "~/services/query_client";
import { GameFinalStatsTable } from "./game_final_stats_table";

export const GameFinalScreen = observer(() => {
    const { store } = useGameContext();
    const handleClose = () => {
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    };

    return (
        <Modal
            centered
            opened={store.isFinished}
            onClose={handleClose}
            title="Partie terminée"
            size="lg"
        >
            <Stack gap="sm">
                <Text size="lg">{store.winner.pseudo} remporte la partie !</Text>

                <Text size="lg">
                    {store.isUserWinner
                        ? "Félicitations pour votre victoire 🎉"
                        : "Bon allez ça se passera mieux la prochaine fois 😬"}
                </Text>

                <Text size="sm" c="dimmed">
                    Partie terminée au tour {store.game.data.currentRound}
                </Text>

                <GameFinalStatsTable
                    me={store.me}
                    opponent={store.opponent}
                    winnerUserId={store.winner.userId}
                />

                <Button onClick={handleClose} mt="sm">
                    Retour au matchmaking
                </Button>
            </Stack>
        </Modal>
    );
});
