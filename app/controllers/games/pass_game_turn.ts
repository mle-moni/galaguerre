import Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getSocketDataFromSocketId } from "#services/sockets/sockets_data";
import type { Socket } from "socket.io";
import { whichPlayerAmI } from "./game_utils.js";
import { setupNextGameTurn } from "./setup_next_game_turn.js";

export const passGameTurn = async (socket: Socket) => {
    const socketData = getSocketDataFromSocketId(socket.id);

    if (!socketData) {
        emitSocketEvent(
            "notify_error",
            { error: "Une erreur est survenue, essayez de rafraichir la page" },
            socket.id,
        );
        return;
    }

    const { userId } = socketData;

    const currentGame = await Game.query()
        .where((q) => q.where("playerOneId", userId).orWhere("playerTwoId", userId))
        .andWhere("isFinished", false)
        .first();

    if (!currentGame) {
        emitSocketEvent("notify_error", { error: "Vous n'êtes pas en jeu" }, socket.id);
        return;
    }

    const { playerType } = whichPlayerAmI(currentGame, userId);

    const playerOneMisbehaving =
        playerType === "PLAYER_ONE" && currentGame.data.state === "PLAYER_TWO_TURN";
    const playerTwoMisbehaving =
        playerType === "PLAYER_TWO" && currentGame.data.state === "PLAYER_ONE_TURN";

    if (playerOneMisbehaving || playerTwoMisbehaving) {
        emitSocketEvent("notify_error", { error: "Ce n'est pas votre tour (gros con)" }, socket.id);
        return;
    }

    await setupNextGameTurn(currentGame);
};
