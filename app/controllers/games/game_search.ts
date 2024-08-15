import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { MATCHMAKING_QUEUE, addMatchmakingQueueItem } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { HttpContext } from "@adonisjs/core/http";
import { createGame } from "./create_game.js";

export const gameSearch = async ({ auth }: HttpContext) => {
    const user = auth.user!;

    if (MATCHMAKING_QUEUE.length === 0) {
        addMatchmakingQueueItem(user.id);
        return { message: "Waiting for an opponent to join..." };
    }

    const opponent = MATCHMAKING_QUEUE.shift()!;

    const game = await createGame({ playerOneId: opponent.userId, playerTwoId: user.id });

    const rooms = [
        WsRooms.personalSocketRoom(opponent.userId),
        WsRooms.personalSocketRoom(user.id),
    ];

    emitSocketEvent("game:created", { gameId: game.id }, rooms);

    return { message: "Game created", game };
};
