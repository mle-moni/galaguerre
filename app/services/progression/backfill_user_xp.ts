import { computePlayerXpGain } from "#api_types/progression";
import Game from "#models/game";
import { getWinnerUserId } from "#services/elo";
import { gameQualifiesForRewards } from "#services/rewards/game_qualifies_for_rewards";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import db from "@adonisjs/lucid/services/db";

const PAGE_SIZE = 500;

const isHumanUserId = (userId: number): boolean => userId !== TRAINING_AI_USER_ID;

const computeGameXpByUserId = (game: Game): Map<number, number> => {
    const xpByUserId = new Map<number, number>();

    if (game.data.isOnboardingTutorial || !gameQualifiesForRewards(game)) {
        return xpByUserId;
    }

    const winnerUserId = getWinnerUserId(game);
    const isDraw = winnerUserId === null;
    const isTraining = game.data.isTraining === true;

    for (const userId of [game.data.playerOne.userId, game.data.playerTwo.userId]) {
        if (!isHumanUserId(userId)) continue;

        const isWinner = !isDraw && winnerUserId === userId;
        const xp = computePlayerXpGain({ isWinner, isDraw, isTraining });
        xpByUserId.set(userId, xp);
    }

    return xpByUserId;
};

export const backfillUserXp = async (): Promise<void> => {
    const totalXpByUserId = new Map<number, number>();
    let page = 0;

    while (true) {
        const games = await Game.query()
            .where("isFinished", true)
            .select("id", "data")
            .orderBy("id")
            .limit(PAGE_SIZE)
            .offset(page * PAGE_SIZE);

        if (games.length === 0) break;

        for (const game of games) {
            const gameXpByUserId = computeGameXpByUserId(game);

            for (const [userId, xp] of gameXpByUserId) {
                totalXpByUserId.set(userId, (totalXpByUserId.get(userId) ?? 0) + xp);
            }
        }

        page += 1;
    }

    await db.transaction(async (trx) => {
        await trx.from("users").update({ xp: 0 });

        for (const [userId, xp] of totalXpByUserId) {
            await trx.from("users").where("id", userId).update({ xp });
        }
    });
};
