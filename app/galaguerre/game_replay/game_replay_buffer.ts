import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import { REPLAY_FORMAT_VERSION, type GameReplayData } from "#api_types/game_replay.types";
import GameReplay from "#models/game_replay";
import type Game from "#models/game";

const activeReplays = new Map<number, GameReplayData>();

const getOrCreateBuffer = (gameId: number): GameReplayData => {
    const existing = activeReplays.get(gameId);
    if (existing) return existing;

    const replay: GameReplayData = {
        version: REPLAY_FORMAT_VERSION,
        steps: [],
    };
    activeReplays.set(gameId, replay);
    return replay;
};

export const appendReplayStep = (game: Game, presentation: GamePresentationUpdate): void => {
    getOrCreateBuffer(game.id).steps.push(presentation);
};

export const flushReplayToDatabase = async (game: Game): Promise<void> => {
    const gameId = game.id;
    const replay = activeReplays.get(gameId);
    if (!replay || replay.steps.length === 0) {
        activeReplays.delete(gameId);
        return;
    }

    if (!("$isPersisted" in game)) {
        activeReplays.delete(gameId);
        return;
    }

    await GameReplay.updateOrCreate(
        { gameId },
        {
            data: replay,
        },
    );

    activeReplays.delete(gameId);
};

export const gameHasReplayRecord = async (gameId: number): Promise<boolean> => {
    const record = await GameReplay.query().where("gameId", gameId).select("id").first();
    return record !== null;
};

export const loadGameReplayData = async (gameId: number): Promise<GameReplayData | null> => {
    const record = await GameReplay.findBy("gameId", gameId);
    if (!record || record.data.steps.length === 0) {
        return null;
    }

    return record.toReplayData();
};

export const getActiveReplayBuffer = (gameId: number): GameReplayData | undefined =>
    activeReplays.get(gameId);
