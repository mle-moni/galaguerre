import type {
    GamePlayerStats,
    GameRatingPlayerResult,
    GameRatingResult,
} from "#api_types/game.types";

export type GameHistoryResult = "WIN" | "LOSS" | "DRAW";

export interface ApiGameHistoryUser {
    userId: number;
    pseudo: string | null;
    elo: number;
    wins: number;
    losses: number;
}

export interface ApiGameHistoryEntry {
    gameId: number;
    opponentUserId: number;
    opponentPseudo: string | null;
    result: GameHistoryResult;
    eloDelta: number | null;
    roundCount: number;
    finishedAt: string;
    isTraining: boolean;
}

export interface ApiGameHistoryList {
    user: ApiGameHistoryUser;
    games: ApiGameHistoryEntry[];
}

export interface ApiGameHistoryPlayer {
    userId: number;
    pseudo: string | null;
    stats: GamePlayerStats;
}

export interface ApiGameHistoryDetail {
    gameId: number;
    user: ApiGameHistoryUser;
    opponent: ApiGameHistoryPlayer;
    player: ApiGameHistoryPlayer;
    winnerId: number | null;
    result: GameHistoryResult;
    ratingResult: GameRatingResult | null;
    playerRating: GameRatingPlayerResult | null;
    roundCount: number;
    finishedAt: string;
}
