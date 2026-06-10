import type { GameData, MinionSpotId } from "#api_types/game.types";
import type Game from "#models/game";
import type { Assert } from "@japa/assert";

type PlayerKey = "playerOne" | "playerTwo";

export const assertBoardSpot = (
    assert: Assert,
    game: Game,
    player: PlayerKey,
    spotId: MinionSpotId,
    expected: null | {
        health?: number;
        attack?: number;
        attacksThisRound?: number;
        placedAtRound?: number;
        lastActionAtRound?: number;
    },
): void => {
    const minion = game.data[player].board[spotId];

    if (expected === null) {
        assert.isNull(minion, `Expected ${player}.${spotId} to be empty`);
        return;
    }

    assert.isNotNull(minion, `Expected ${player}.${spotId} to have a minion`);
    if (expected.health !== undefined) assert.equal(minion!.health, expected.health);
    if (expected.attack !== undefined) assert.equal(minion!.attack, expected.attack);
    if (expected.attacksThisRound !== undefined) {
        assert.equal(minion!.attacksThisRound, expected.attacksThisRound);
    }
    if (expected.placedAtRound !== undefined) {
        assert.equal(minion!.placedAtRound, expected.placedAtRound);
    }
    if (expected.lastActionAtRound !== undefined) {
        assert.equal(minion!.lastActionAtRound, expected.lastActionAtRound);
    }
};

export const assertPlayerHealth = (
    assert: Assert,
    game: Game,
    player: PlayerKey,
    health: number,
): void => {
    assert.equal(game.data[player].health, health);
};

export const assertGameState = (assert: Assert, game: Game, state: GameData["state"]): void => {
    assert.equal(game.data.state, state);
};

export const assertIsFinished = (assert: Assert, game: Game, isFinished: boolean): void => {
    assert.equal(game.isFinished, isFinished);
};
