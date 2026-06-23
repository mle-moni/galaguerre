import type { GamePresentationUpdate } from "./game_narrative.types.js";

export const REPLAY_FORMAT_VERSION = 1 as const;

export interface GameReplayData {
    version: typeof REPLAY_FORMAT_VERSION;
    steps: GamePresentationUpdate[];
}

export interface ApiGameReplayPlayer {
    userId: number;
    pseudo: string | null;
}

export interface ApiGameReplay {
    gameId: number;
    playerOne: ApiGameReplayPlayer;
    playerTwo: ApiGameReplayPlayer;
    winnerId: number | null;
    replay: GameReplayData;
}
