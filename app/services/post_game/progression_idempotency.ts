import type { GameData } from "#api_types/game.types";
import Game from "#models/game";

export const loadPersistedGameData = async (gameId: number): Promise<GameData | null> => {
    const row = await Game.query().where("id", gameId).select("data").first();
    return row?.data ?? null;
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
