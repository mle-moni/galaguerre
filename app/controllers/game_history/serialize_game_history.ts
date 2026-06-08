import type {
    ApiGameHistoryEntry,
    ApiGameHistoryPlayer,
    ApiGameHistoryUser,
    GameHistoryResult,
} from "#api_types/game_history.types";
import {
    DEFAULT_PLAYER_STATS,
    type GamePlayer,
    type GameRatingResult,
} from "#api_types/game.types";
import type Game from "#models/game";
import type User from "#models/user";
import { getGameFinishedAtIso } from "../../galaguerre/game/get_game_finished_at.js";

export const serializeGameHistoryUser = (user: User): ApiGameHistoryUser => ({
    userId: user.id,
    pseudo: user.pseudo,
    elo: user.elo,
    wins: user.wins,
    losses: user.losses,
});

export const getOpponentUserId = (game: Game, userId: number): number => {
    if (game.playerOneId === userId) {
        return game.playerTwoId ?? game.data.playerTwo.userId;
    }

    return game.playerOneId;
};

export const isGameParticipant = (game: Game, userId: number): boolean =>
    game.playerOneId === userId || game.playerTwoId === userId;

export const getGameResult = (game: Game, userId: number): GameHistoryResult => {
    if (game.winnerId === null) {
        return "DRAW";
    }

    return game.winnerId === userId ? "WIN" : "LOSS";
};

export const getEloDelta = (game: Game, userId: number): number | null => {
    const ratingResult = game.data.ratingResult;
    if (!ratingResult) {
        return null;
    }

    return game.playerOneId === userId
        ? ratingResult.playerOne.delta
        : ratingResult.playerTwo.delta;
};

const getPlayerFromGameData = (game: Game, userId: number): GamePlayer =>
    game.playerOneId === userId ? game.data.playerOne : game.data.playerTwo;

export const serializeGameHistoryPlayer = (
    game: Game,
    userId: number,
    user?: User | null,
): ApiGameHistoryPlayer => {
    const player = getPlayerFromGameData(game, userId);

    return {
        userId: player.userId,
        pseudo: user?.pseudo ?? player.pseudo,
        stats: player.stats ?? DEFAULT_PLAYER_STATS,
    };
};

export const serializeGameHistoryEntry = (
    game: Game,
    userId: number,
    usersById?: Map<number, User>,
): ApiGameHistoryEntry => {
    const opponentUserId = getOpponentUserId(game, userId);
    const opponent = getPlayerFromGameData(game, opponentUserId);
    const opponentUser = usersById?.get(opponentUserId);

    return {
        gameId: game.id,
        opponentUserId,
        opponentPseudo: opponentUser?.pseudo ?? opponent.pseudo,
        result: getGameResult(game, userId),
        eloDelta: getEloDelta(game, userId),
        roundCount: game.data.currentRound,
        finishedAt: getGameFinishedAtIso(game),
        isTraining: game.data.isTraining ?? false,
    };
};

export const getRatingResult = (game: Game): GameRatingResult | null =>
    game.data.ratingResult ?? null;
