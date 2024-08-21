import { MINION_SPOT_IDS, SPOT_OWNERS } from "#api_types/game.types";
import { passGameTurn } from "#controllers/games/pass_game_turn";
import { subscribeToClientSocketEvent } from "#services/sockets/emit_socket_event";
import vine from "@vinejs/vine";
import type { Socket } from "socket.io";

export const joinAuthRestrictedEvents = (socket: Socket) => {
    socket.on("debug", (...data) => {
        socket.emit("debug", ...data);
    });
    socket.on("pass_turn", () => {
        passGameTurn(socket);
    });

    subscribeToClientSocketEvent(
        socket,
        "game:play_card",
        (data) => {
            console.log(`from ${socket.id}`, data);
        },
        vine.object({
            cardId: vine.string(),
            spotId: vine.enum(MINION_SPOT_IDS),
            owner: vine.enum(SPOT_OWNERS),
        }),
    );
};

export const partAuthRestrictedEvents = (socket: Socket) => {
    socket.removeAllListeners("debug");
    socket.removeAllListeners("pass_turn");
};
