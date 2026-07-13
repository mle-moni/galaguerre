import type { GameData } from "#api_types/game.types";
import Game from "#models/game";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

export const withGameProgressionLock = async <T>(
    game: Game,
    work: (lockedGame: Game, trx: TransactionClientContract) => Promise<T>,
): Promise<T> => {
    const { lockedGame, result } = await db.transaction(async (trx) => {
        const lockedGame = await Game.query({ client: trx })
            .where("id", game.id)
            .forUpdate()
            .firstOrFail();

        return {
            lockedGame,
            result: await work(lockedGame, trx),
        };
    });

    game.data = lockedGame.data;
    game.winnerId = lockedGame.winnerId;
    game.isFinished = lockedGame.isFinished;
    game.endedAt = lockedGame.endedAt;

    return result;
};

export const hasRatingBeenApplied = (data: GameData): boolean => data.ratingResult !== undefined;

export const hasRewardsBeenApplied = (data: GameData): boolean => data.rewardResult !== undefined;

export const hasXpBeenApplied = (data: GameData): boolean => data.xpResult !== undefined;

export const hasDailyQuestsBeenApplied = (data: GameData): boolean =>
    data.dailyQuestProgressApplied === true;

export const hasPostGameProgressionBeenApplied = (data: GameData): boolean =>
    data.postGameProgressionApplied === true;

export const syncProgressionMarkersFromPersisted = (game: Game, persisted: GameData): void => {
    game.data = {
        ...game.data,
        ratingResult: persisted.ratingResult ?? game.data.ratingResult,
        rewardResult: persisted.rewardResult ?? game.data.rewardResult,
        xpResult: persisted.xpResult ?? game.data.xpResult,
        dailyQuestProgressApplied:
            persisted.dailyQuestProgressApplied ?? game.data.dailyQuestProgressApplied,
        postGameProgressionApplied:
            persisted.postGameProgressionApplied ?? game.data.postGameProgressionApplied,
    };
};
