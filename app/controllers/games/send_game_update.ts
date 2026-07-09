import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getSpectatorsForGame } from "#services/sockets/spectator_watchers";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { WsRooms } from "#services/sockets/ws_rooms";
import { refreshGameDynamicCosts } from "../../galaguerre/dynamic_cost/compute_effective_cost.js";
import { buildPresentationForUser } from "../../galaguerre/game_narrative/build_presentation_update.js";
import { scheduleAiDiscoverIfNeeded } from "../../galaguerre/ai/schedule_ai_discover.js";

const getTrainingHumanUserId = (game: Game): number => {
    if (game.data.playerOne.userId === TRAINING_AI_USER_ID) {
        return game.data.playerTwo.userId;
    }

    return game.data.playerOne.userId;
};

const emitForUser = (
    game: Game,
    recipientUserId: number,
    viewAsUserId: number,
    presentation?: GamePresentationUpdate,
) => {
    const filteredPresentation = presentation
        ? buildPresentationForUser(presentation, viewAsUserId)
        : undefined;

    emitSocketEvent(
        "game:update",
        {
            game: game.getApiJson(viewAsUserId),
            ...(filteredPresentation ? { presentation: filteredPresentation } : {}),
        },
        WsRooms.personalSocketRoom(recipientUserId),
    );
};

const emitForSpectators = (game: Game, presentation?: GamePresentationUpdate) => {
    const playerIds = new Set([game.data.playerOne.userId, game.data.playerTwo.userId]);

    for (const watch of getSpectatorsForGame(game.id)) {
        if (playerIds.has(watch.spectatorUserId)) continue;

        emitForUser(game, watch.spectatorUserId, watch.viewAsUserId, presentation);
    }
};

export const sendGameUpdate = (game: Game, presentation?: GamePresentationUpdate) => {
    refreshGameDynamicCosts(game.data);

    if (game.data.isTraining) {
        const humanUserId = getTrainingHumanUserId(game);
        emitForUser(game, humanUserId, humanUserId, presentation);
        scheduleAiDiscoverIfNeeded(game);
        return;
    }

    emitForUser(game, game.data.playerOne.userId, game.data.playerOne.userId, presentation);
    emitForUser(game, game.data.playerTwo.userId, game.data.playerTwo.userId, presentation);
    emitForSpectators(game, presentation);

    scheduleAiDiscoverIfNeeded(game);
};
