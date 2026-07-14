import type { GameXpPlayerResult, GameXpResult } from "#api_types/progression";
import { computePlayerXpGain } from "#api_types/progression";
import Game from "#models/game";
import User from "#models/user";
import { getWinnerUserId } from "#services/elo";
import { gameQualifiesForRewards } from "#services/rewards/game_qualifies_for_rewards";
import {
    hasXpBeenApplied,
    withGameProgressionLock,
} from "#services/post_game/progression_idempotency";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

const EMPTY_XP: GameXpPlayerResult = { xp: 0 };

const isHumanUserId = (userId: number): boolean => userId !== TRAINING_AI_USER_ID;

const applyGameXpLocked = async (game: Game, trx: TransactionClientContract): Promise<void> => {
    if (hasXpBeenApplied(game.data)) {
        return;
    }

    const winnerUserId = getWinnerUserId(game);
    const isDraw = winnerUserId === null;
    const isTraining = game.data.isTraining === true;

    const humanUserIds = [game.data.playerOne.userId, game.data.playerTwo.userId].filter(
        isHumanUserId,
    );

    if (humanUserIds.length === 0) return;

    if (game.data.isOnboardingTutorial || isTraining || !gameQualifiesForRewards(game)) {
        game.data = {
            ...game.data,
            xpResult: {
                playerOne: EMPTY_XP,
                playerTwo: EMPTY_XP,
            },
        };
        game.useTransaction(trx);
        await game.save();
        return;
    }

    const users = await User.query({ client: trx })
        .whereIn("id", humanUserIds)
        .orderBy("id", "asc")
        .forUpdate();
    const usersById = new Map(users.map((user) => [user.id, user]));

    const playerOneXp = computePlayerXpGain({
        isWinner: !isDraw && winnerUserId === game.data.playerOne.userId,
        isDraw,
        isTraining,
    });

    const playerTwoXp = computePlayerXpGain({
        isWinner: !isDraw && winnerUserId === game.data.playerTwo.userId,
        isDraw,
        isTraining,
    });

    for (const userId of humanUserIds) {
        const user = usersById.get(userId);
        if (!user) continue;

        const xpGain = userId === game.data.playerOne.userId ? playerOneXp : playerTwoXp;

        if (xpGain > 0) {
            user.xp += xpGain;
        }

        user.useTransaction(trx);
        await user.save();
    }

    const xpResult: GameXpResult = {
        playerOne: isHumanUserId(game.data.playerOne.userId) ? { xp: playerOneXp } : EMPTY_XP,
        playerTwo: isHumanUserId(game.data.playerTwo.userId) ? { xp: playerTwoXp } : EMPTY_XP,
    };

    game.data = {
        ...game.data,
        xpResult,
    };

    game.useTransaction(trx);
    await game.save();
};

export const applyGameXp = async (game: Game, trx?: TransactionClientContract): Promise<void> => {
    if (!(game instanceof Game)) return;

    if (trx) {
        return applyGameXpLocked(game, trx);
    }

    return withGameProgressionLock(game, applyGameXpLocked);
};
