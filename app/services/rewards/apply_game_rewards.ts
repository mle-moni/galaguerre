import type { GameRewardPlayerResult, GameRewardResult } from "#api_types/rewards.types";
import { computePlayerGoldReward } from "#api_types/rewards.types";
import Game from "#models/game";
import User from "#models/user";
import { getWinnerUserId } from "#services/elo";
import { gameQualifiesForRewards } from "#services/rewards/game_qualifies_for_rewards";
import {
    hasRewardsBeenApplied,
    withGameProgressionLock,
} from "#services/post_game/progression_idempotency";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

const EMPTY_REWARD: GameRewardPlayerResult = { goldCoins: 0, packs: 0 };

const isHumanUserId = (userId: number): boolean => userId !== TRAINING_AI_USER_ID;

const computePlayerReward = (
    isWinner: boolean,
    isDraw: boolean,
    isTraining: boolean,
): GameRewardPlayerResult => ({
    goldCoins: computePlayerGoldReward({ isWinner, isDraw, isTraining }),
    packs: 0,
});

const applyGameRewardsLocked = async (
    game: Game,
    trx: TransactionClientContract,
): Promise<void> => {
    if (hasRewardsBeenApplied(game.data)) {
        return;
    }

    const winnerUserId = getWinnerUserId(game);
    const isDraw = winnerUserId === null;
    const isTraining = game.data.isTraining === true;

    const humanUserIds = [game.data.playerOne.userId, game.data.playerTwo.userId].filter(
        isHumanUserId,
    );

    if (humanUserIds.length === 0) return;

    if (!gameQualifiesForRewards(game)) {
        game.data = {
            ...game.data,
            rewardResult: {
                playerOne: EMPTY_REWARD,
                playerTwo: EMPTY_REWARD,
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

    const playerOneReward = computePlayerReward(
        !isDraw && winnerUserId === game.data.playerOne.userId,
        isDraw,
        isTraining,
    );

    const playerTwoReward = computePlayerReward(
        !isDraw && winnerUserId === game.data.playerTwo.userId,
        isDraw,
        isTraining,
    );

    for (const userId of humanUserIds) {
        const user = usersById.get(userId);
        if (!user) continue;

        const reward = userId === game.data.playerOne.userId ? playerOneReward : playerTwoReward;

        if (reward.goldCoins > 0) {
            user.goldCoins += reward.goldCoins;
        }

        user.useTransaction(trx);
        await user.save();
    }

    const rewardResult: GameRewardResult = {
        playerOne: isHumanUserId(game.data.playerOne.userId) ? playerOneReward : EMPTY_REWARD,
        playerTwo: isHumanUserId(game.data.playerTwo.userId) ? playerTwoReward : EMPTY_REWARD,
    };

    game.data = {
        ...game.data,
        rewardResult,
    };

    game.useTransaction(trx);
    await game.save();
};

export const applyGameRewards = async (
    game: Game,
    trx?: TransactionClientContract,
): Promise<void> => {
    if (!(game instanceof Game)) return;

    if (trx) {
        return applyGameRewardsLocked(game, trx);
    }

    return withGameProgressionLock(game, applyGameRewardsLocked);
};
