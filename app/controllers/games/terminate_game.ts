import Game from "#models/game";
import { applyGameResult, getWinnerUserId } from "#services/elo";
import { completeOnboardingIfNeeded } from "#services/onboarding/complete_onboarding_if_needed";
import { getTrainingGameHumanUserId } from "#services/onboarding/get_training_game_human_user_id";
import { applyGameRewards } from "#services/rewards/apply_game_rewards";
import { applyGameXp } from "#services/progression/apply_game_xp";
import { updateDailyQuestProgressForGame } from "#services/daily_quests/update_daily_quest_progress";
import {
    hasPostGameProgressionBeenApplied,
    withGameProgressionLock,
} from "#services/post_game/progression_idempotency";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";
import { DateTime } from "luxon";
import { cloneGameData } from "../../galaguerre/game_narrative/clone_game_data.js";
import { finalizeGameReplay } from "../../galaguerre/game_replay/game_replay_buffer.js";
import { clearAllGameTimers } from "../../galaguerre/timers/game_timers.js";
import { sendGameUpdate } from "./send_game_update.js";

const claimGameFinish = async (game: Game): Promise<boolean> => {
    const endedAt = DateTime.now();
    const claimedRows = await db
        .from("games")
        .where("id", game.id)
        .where("is_finished", false)
        .update({
            is_finished: true,
            ended_at: endedAt.toSQL(),
        });

    if (Number(claimedRows) === 0) {
        return false;
    }

    game.isFinished = true;
    game.endedAt = endedAt;
    return true;
};

const applyPostGameProgression = async (
    game: Game,
    trx: TransactionClientContract,
): Promise<void> => {
    if (game.data.isTraining) {
        const winnerUserId = getWinnerUserId(game);
        game.winnerId = winnerUserId === TRAINING_AI_USER_ID ? null : winnerUserId;

        const humanUserId = getTrainingGameHumanUserId(game);
        if (humanUserId !== null && game instanceof Game) {
            await completeOnboardingIfNeeded(humanUserId);
        }
    } else if (game.data.isFriendly) {
        game.winnerId = getWinnerUserId(game);
    } else {
        await applyGameResult(game, trx);
    }

    if (!game.data.isFriendly) {
        await applyGameRewards(game, trx);
        await applyGameXp(game, trx);
        await updateDailyQuestProgressForGame(game, trx);
    }

    game.data = {
        ...game.data,
        state: "FINISHED",
        postGameProgressionApplied: true,
    };
    game.useTransaction(trx);
    await game.save();
};

export const terminateGame = async (game: Game, options?: { skipSendUpdate?: boolean }) => {
    if (game.isFinished && hasPostGameProgressionBeenApplied(game.data)) return;

    const terminalGameData = cloneGameData(game.data);

    const claimed = await claimGameFinish(game);
    if (!claimed) {
        await game.refresh();
        if (!game.isFinished) return;
        if (hasPostGameProgressionBeenApplied(game.data)) return;
    } else {
        clearAllGameTimers(game.id);
        void finalizeGameReplay(game.id).catch((err) =>
            console.error(`Replay finalize failed for game ${game.id}`, err),
        );
    }

    await withGameProgressionLock(game, async (lockedGame, trx) => {
        if (hasPostGameProgressionBeenApplied(lockedGame.data)) {
            return;
        }

        lockedGame.data = {
            ...terminalGameData,
            ratingResult: lockedGame.data.ratingResult,
            rewardResult: lockedGame.data.rewardResult,
            xpResult: lockedGame.data.xpResult,
            dailyQuestProgressApplied: lockedGame.data.dailyQuestProgressApplied,
            postGameProgressionApplied: lockedGame.data.postGameProgressionApplied,
        };

        delete lockedGame.data.turnEndsAt;
        delete lockedGame.data.mulliganEndsAt;
        lockedGame.data.state = "FINISHED";

        await applyPostGameProgression(lockedGame, trx);
    });

    if (!options?.skipSendUpdate) {
        sendGameUpdate(game);
    }
};
