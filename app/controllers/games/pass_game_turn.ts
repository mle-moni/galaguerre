import Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getSocketDataFromSocketId } from "#services/sockets/sockets_data";
import type { Socket } from "socket.io";
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

    await setupNextGameTurn(currentGame);
};
