import type Game from "#models/game";
import { applyGameResult, getWinnerUserId } from "#services/elo";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { DateTime } from "luxon";
import { clearAllGameTimers } from "../../galaguerre/timers/game_timers.js";
import { sendGameUpdate } from "./send_game_update.js";

export const terminateGame = async (game: Game, options?: { skipSendUpdate?: boolean }) => {
    if (game.isFinished) return;

    clearAllGameTimers(game.id);
    delete game.data.turnEndsAt;
    delete game.data.mulliganEndsAt;

    game.data.state = "FINISHED";
    game.isFinished = true;
    game.endedAt = DateTime.now();

    if (game.data.isTraining) {
        const winnerUserId = getWinnerUserId(game);
        game.winnerId = winnerUserId === TRAINING_AI_USER_ID ? null : winnerUserId;
        await game.save();
        if (!options?.skipSendUpdate) {
            sendGameUpdate(game);
        }
        return;
    }

    await applyGameResult(game);
    await game.save();

    if (!options?.skipSendUpdate) {
        sendGameUpdate(game);
    }
};
