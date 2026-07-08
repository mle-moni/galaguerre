import type { GameRatingPlayerResult, GameRatingResult } from "#api_types/game.types";
import type Game from "#models/game";
import User from "#models/user";
import {
    hasRatingBeenApplied,
    loadPersistedGameData,
    syncProgressionMarkersFromPersisted,
} from "#services/post_game/progression_idempotency";
import db from "@adonisjs/lucid/services/db";

export const DEFAULT_ELO = 1200;
const DEFAULT_K_FACTOR = 32;

export const getWinnerUserId = (game: Game): number | null => {
    const { playerOne, playerTwo } = game.data;

    if (playerOne.health <= 0 && playerTwo.health <= 0) {
        return null;
    }

    if (playerOne.health <= 0) {
        return playerTwo.userId;
    }

    if (playerTwo.health <= 0) {
        return playerOne.userId;
    }

    return null;
};

export const computeEloDeltas = (
    winnerElo: number,
    loserElo: number,
    k = DEFAULT_K_FACTOR,
): { winnerDelta: number; loserDelta: number } => {
    const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
    const winnerDelta = Math.round(k * (1 - expectedWinner));
    const loserDelta = -winnerDelta;

    return { winnerDelta, loserDelta };
};

const buildPlayerRatingResult = (eloBefore: number, delta: number): GameRatingPlayerResult => ({
    eloBefore,
    eloAfter: eloBefore + delta,
    delta,
});

export const applyGameResult = async (game: Game): Promise<void> => {
    const winnerUserId = getWinnerUserId(game);

    const persistedData = await loadPersistedGameData(game.id);
    if (persistedData) {
        syncProgressionMarkersFromPersisted(game, persistedData);
        if (hasRatingBeenApplied(persistedData)) {
            return;
        }
    }

    if (winnerUserId === null) {
        game.winnerId = null;
        return;
    }

    const playerOneId = game.playerOneId;
    const playerTwoId = game.playerTwoId;
    if (playerOneId === null || playerTwoId === null) {
        return;
    }

    await db.transaction(async (trx) => {
        const playerOne = await User.query({ client: trx })
            .where("id", playerOneId)
            .forUpdate()
            .firstOrFail();
        const playerTwo = await User.query({ client: trx })
            .where("id", playerTwoId)
            .forUpdate()
            .firstOrFail();

        const winner = winnerUserId === playerOne.id ? playerOne : playerTwo;
        const loser = winnerUserId === playerOne.id ? playerTwo : playerOne;
        const winnerEloBefore = winner.elo;
        const loserEloBefore = loser.elo;
        const { winnerDelta, loserDelta } = computeEloDeltas(winnerEloBefore, loserEloBefore);

        winner.elo = winnerEloBefore + winnerDelta;
        winner.wins += 1;
        loser.elo = loserEloBefore + loserDelta;
        loser.losses += 1;

        await winner.useTransaction(trx).save();
        await loser.useTransaction(trx).save();

        game.winnerId = winnerUserId;

        const playerOneIsWinner = playerOne.id === winner.id;
        const ratingResult: GameRatingResult = {
            playerOne: buildPlayerRatingResult(
                playerOneIsWinner ? winnerEloBefore : loserEloBefore,
                playerOneIsWinner ? winnerDelta : loserDelta,
            ),
            playerTwo: buildPlayerRatingResult(
                playerOneIsWinner ? loserEloBefore : winnerEloBefore,
                playerOneIsWinner ? loserDelta : winnerDelta,
            ),
        };

        game.data = {
            ...game.data,
            ratingResult,
        };
    });
};
