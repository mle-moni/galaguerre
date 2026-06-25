import Game from "#models/game";
import { applyGameResult, getWinnerUserId } from "#services/elo";
import { completeOnboardingIfNeeded } from "#services/onboarding/complete_onboarding_if_needed";
import { getTrainingGameHumanUserId } from "#services/onboarding/get_training_game_human_user_id";
import { applyGameRewards } from "#services/rewards/apply_game_rewards";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { DateTime } from "luxon";
import { finalizeGameReplay } from "../../galaguerre/game_replay/game_replay_buffer.js";
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
    void finalizeGameReplay(game.id).catch((err) =>
        console.error(`Replay finalize failed for game ${game.id}`, err),
    );

    if (game.data.isTraining) {
        const winnerUserId = getWinnerUserId(game);
        game.winnerId = winnerUserId === TRAINING_AI_USER_ID ? null : winnerUserId;
        await game.save();

        const humanUserId = getTrainingGameHumanUserId(game);
        if (humanUserId !== null && game instanceof Game) {
            await completeOnboardingIfNeeded(humanUserId);
        }

        await applyGameRewards(game);

        if (!options?.skipSendUpdate) {
            sendGameUpdate(game);
        }
        return;
    }

    await applyGameResult(game);
    await applyGameRewards(game);
    await game.save();

    if (!options?.skipSendUpdate) {
        sendGameUpdate(game);
    }
};
