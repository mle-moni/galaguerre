import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { WsRooms } from "#services/sockets/ws_rooms";

export const sendGameUpdate = (game: Game) => {
    const p1 = game.data.playerOne;
    const p2 = game.data.playerTwo;

    emitSocketEvent(
        "game:update",
        { game: game.getApiJson(p1.userId) },
        WsRooms.personalSocketRoom(p1.userId),
    );

    emitSocketEvent(
        "game:update",
        { game: game.getApiJson(p2.userId) },
        WsRooms.personalSocketRoom(p2.userId),
    );
};
