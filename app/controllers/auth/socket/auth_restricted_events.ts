import { MAX_BOARD_MINIONS } from "#api_types/board";
import { SPOT_OWNERS } from "#api_types/game.types";
import { abandonGame } from "#controllers/games/abandon_game";
import { gameMulligan } from "#controllers/games/mulligan/game_mulligan";
import { gameDiscoverChoice } from "#controllers/games/discover/game_discover_choice";
import { gameMinionAction } from "#controllers/games/minion_action/game_minion_action";
import { gameWeaponAction } from "#controllers/games/weapon_action/game_weapon_action";
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
        vine.create({
            cardId: vine.string(),
            boardIndex: vine.number().withoutDecimals().min(0).max(MAX_BOARD_MINIONS).nullable(),
            owner: vine.enum(SPOT_OWNERS),
            actionTarget: vine
                .object({
                    minionUuid: vine.string().nullable(),
                    owner: vine.enum(SPOT_OWNERS),
                })
                .optional(),
        }),
    );

    subscribeToClientSocketEvent(
        socket,
        "game:minion_action",
        (data) => gameMinionAction(socket.id, data),
        vine.create({
            minionId: vine.string(),
            minionUuid: vine.string().nullable(),
            owner: vine.enum(SPOT_OWNERS),
        }),
    );

    subscribeToClientSocketEvent(
        socket,
        "game:weapon_action",
        (data) => gameWeaponAction(socket.id, data),
        vine.create({
            minionUuid: vine.string().nullable(),
            owner: vine.enum(SPOT_OWNERS),
        }),
    );

    subscribeToClientSocketEvent(
        socket,
        "game:abandon",
        () => abandonGame(socket.id),
        vine.create({}),
    );

    subscribeToClientSocketEvent(
        socket,
        "game:mulligan",
        (data) => gameMulligan(socket.id, data),
        vine.create({
            cardIds: vine.array(vine.string()),
        }),
    );

    subscribeToClientSocketEvent(
        socket,
        "game:discover_choice",
        (data) => gameDiscoverChoice(socket.id, data),
        vine.create({
            cardUuid: vine.string(),
        }),
    );
};

export const partAuthRestrictedEvents = (socket: Socket) => {
    socket.removeAllListeners("debug");
    socket.removeAllListeners("pass_turn");
    socket.removeAllListeners("game:play_card");
    socket.removeAllListeners("game:minion_action");
    socket.removeAllListeners("game:weapon_action");
    socket.removeAllListeners("game:abandon");
    socket.removeAllListeners("game:mulligan");
    socket.removeAllListeners("game:discover_choice");
};
