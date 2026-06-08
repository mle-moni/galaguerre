import { recordAbandon } from "../../galaguerre/game_log/record_game_log.js";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { getGameActionInfos, whichPlayerAmI } from "./game_utils.js";
import { terminateGame } from "./terminate_game.js";

export const abandonGame = async (socketId: string) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    if (userId === TRAINING_AI_USER_ID) {
        emitSocketEvent("notify_error", { error: "Action non autorisée" }, socketId);
        return;
    }

    if (currentGame.isFinished) return;

    const { player } = whichPlayerAmI(currentGame, userId);

    player.health = 0;
    recordAbandon(currentGame, player);

    await terminateGame(currentGame);
};
