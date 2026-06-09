import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { WsRooms } from "#services/sockets/ws_rooms";

const getTrainingHumanUserId = (game: Game): number => {
    if (game.data.playerOne.userId === TRAINING_AI_USER_ID) {
        return game.data.playerTwo.userId;
    }

    return game.data.playerOne.userId;
};

export const sendGameUpdate = (game: Game) => {
    if (game.data.isTraining) {
        const humanUserId = getTrainingHumanUserId(game);

        emitSocketEvent(
            "game:update",
            { game: game.getApiJson(humanUserId) },
            WsRooms.personalSocketRoom(humanUserId),
        );
        return;
    }

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
