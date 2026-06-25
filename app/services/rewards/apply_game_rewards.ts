import type { GameRewardPlayerResult, GameRewardResult } from "#api_types/rewards.types";
import { GOLD_COINS_PER_DEFEAT, GOLD_COINS_PER_VICTORY } from "#api_types/rewards.types";
import Game from "#models/game";
import User from "#models/user";
import { grantCardPacksForUser } from "#services/collection/grant_card_packs_for_user";
import { getWinnerUserId } from "#services/elo";
import {
    getParisCalendarDate,
    isParisCalendarDateToday,
    parseParisCalendarDate,
} from "#services/rewards/get_paris_calendar_date";
import { gameQualifiesForRewards } from "#services/rewards/game_qualifies_for_rewards";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import db from "@adonisjs/lucid/services/db";

const EMPTY_REWARD: GameRewardPlayerResult = { goldCoins: 0, packs: 0 };

const isHumanUserId = (userId: number): boolean => userId !== TRAINING_AI_USER_ID;

const computePlayerReward = (
    isWinner: boolean,
    isDraw: boolean,
    grantVictoryPack: boolean,
): GameRewardPlayerResult => {
    if (isDraw) {
        return { goldCoins: GOLD_COINS_PER_DEFEAT, packs: 0 };
    }

    if (isWinner) {
        return {
            goldCoins: GOLD_COINS_PER_VICTORY,
            packs: grantVictoryPack ? 1 : 0,
        };
    }

    return { goldCoins: GOLD_COINS_PER_DEFEAT, packs: 0 };
};

export const applyGameRewards = async (game: Game): Promise<void> => {
    if (!(game instanceof Game)) return;

    const winnerUserId = getWinnerUserId(game);
    const isDraw = winnerUserId === null;

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
        await game.save();
        return;
    }

    const todayParis = getParisCalendarDate();

    await db.transaction(async (trx) => {
        const users = await User.query({ client: trx }).whereIn("id", humanUserIds).forUpdate();

        const usersById = new Map(users.map((user) => [user.id, user]));

        const playerOneReward = computePlayerReward(
            !isDraw && winnerUserId === game.data.playerOne.userId,
            isDraw,
            isHumanUserId(game.data.playerOne.userId) &&
                !isDraw &&
                winnerUserId === game.data.playerOne.userId &&
                !isParisCalendarDateToday(
                    usersById.get(game.data.playerOne.userId)?.lastVictoryPackGrantedOn ?? null,
                ),
        );

        const playerTwoReward = computePlayerReward(
            !isDraw && winnerUserId === game.data.playerTwo.userId,
            isDraw,
            isHumanUserId(game.data.playerTwo.userId) &&
                !isDraw &&
                winnerUserId === game.data.playerTwo.userId &&
                !isParisCalendarDateToday(
                    usersById.get(game.data.playerTwo.userId)?.lastVictoryPackGrantedOn ?? null,
                ),
        );

        for (const userId of humanUserIds) {
            const user = usersById.get(userId);
            if (!user) continue;

            const reward =
                userId === game.data.playerOne.userId ? playerOneReward : playerTwoReward;

            if (reward.goldCoins > 0) {
                user.goldCoins += reward.goldCoins;
            }

            if (reward.packs > 0) {
                user.lastVictoryPackGrantedOn = parseParisCalendarDate(todayParis);
                await grantCardPacksForUser(user.id, reward.packs, trx);
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
    });
};
