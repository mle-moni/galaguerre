import { MINION_SPOT_IDS, SPOT_OWNERS } from "#api_types/game.types";
import { gameMinionAction } from "#controllers/games/minion_action/game_minion_action";
import { passGameTurn } from "#controllers/games/pass_game_turn";
import { gamePlayCard } from "#controllers/games/play_card/game_play_card";
import { subscribeToClientSocketEvent } from "#services/sockets/emit_socket_event";
import vine from "@vinejs/vine";
import type { Socket } from "socket.io";

export const joinAuthRestrictedEvents = (socket: Socket) => {
    socket.on("debug", (...data) => {
        socket.emit("debug", ...data);
    });
    socket.on("pass_turn", () => {
        passGameTurn(socket.id);
    });

    subscribeToClientSocketEvent(
        socket,
        "game:play_card",
        (data) => gamePlayCard(socket.id, data),
        vine.object({
            cardId: vine.string(),
            spotId: vine.enum(MINION_SPOT_IDS),
            owner: vine.enum(SPOT_OWNERS),
        }),
    );

    subscribeToClientSocketEvent(
        socket,
        "game:minion_action",
        (data) => gameMinionAction(socket.id, data),
        vine.object({
            minionId: vine.string(),
            spotId: vine.enum(MINION_SPOT_IDS).nullable(),
            owner: vine.enum(SPOT_OWNERS),
        }),
    );
};

export const partAuthRestrictedEvents = (socket: Socket) => {
    socket.removeAllListeners("debug");
    socket.removeAllListeners("pass_turn");
    socket.removeAllListeners("game:play_card");
};
