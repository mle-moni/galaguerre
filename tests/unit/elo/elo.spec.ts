import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { terminateGame } from "#controllers/games/terminate_game";
import { applyGameResult, computeEloDeltas, DEFAULT_ELO, getWinnerUserId } from "#services/elo";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";

test.group("elo", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("computeEloDeltas gives smaller gain when favorite wins", async ({ assert }) => {
        const { winnerDelta, loserDelta } = computeEloDeltas(1500, 1200);

        assert.isBelow(winnerDelta, 16);
        assert.equal(loserDelta, -winnerDelta);
    });

    test("getWinnerUserId returns null on double KO", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 0 },
            }),
        );

        assert.isNull(getWinnerUserId(game));
    });

    test("getWinnerUserId returns surviving player", async ({ assert }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        assert.equal(getWinnerUserId(game), playerTwo.id);
    });

    test("applyGameResult updates ratings and winner on victory", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await playerOne.merge({ elo: 1200, wins: 0, losses: 0 }).save();
        await playerTwo.merge({ elo: 1200, wins: 0, losses: 0 }).save();

        await applyGameResult(game);
        await game.save();

        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(game.winnerId, playerTwo.id);
        assert.equal(playerTwo.wins, 1);
        assert.equal(playerOne.losses, 1);
        assert.isAbove(playerTwo.elo, DEFAULT_ELO);
        assert.isBelow(playerOne.elo, DEFAULT_ELO);
        assert.exists(game.data.ratingResult);
        assert.equal(game.data.ratingResult!.playerTwo.delta, playerTwo.elo - DEFAULT_ELO);
        assert.equal(game.data.ratingResult!.playerOne.delta, playerOne.elo - DEFAULT_ELO);
    });

    test("applyGameResult leaves ratings unchanged on double KO", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 0 },
            }),
        );

        await applyGameResult(game);
        await game.save();

        await playerOne.refresh();
        await playerTwo.refresh();

        assert.isNull(game.winnerId);
        assert.equal(playerOne.elo, DEFAULT_ELO);
        assert.equal(playerTwo.elo, DEFAULT_ELO);
        assert.equal(playerOne.wins, 0);
        assert.equal(playerTwo.wins, 0);
        assert.isUndefined(game.data.ratingResult);
    });

    test("terminateGame is idempotent", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        game.isFinished = true;
        game.data.state = "FINISHED";
        await game.save();

        await terminateGame(game);

        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.wins, 0);
        assert.equal(playerTwo.wins, 0);
        assert.equal(playerOne.elo, DEFAULT_ELO);
        assert.equal(playerTwo.elo, DEFAULT_ELO);
    });

    test("terminateGame applies elo on first finish", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );

        await terminateGame(game);

        await game.refresh();
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.isTrue(game.isFinished);
        assert.equal(game.data.state, "FINISHED");
        assert.equal(game.winnerId, playerTwo.id);
        assert.equal(playerTwo.wins, 1);
        assert.equal(playerOne.losses, 1);
        assert.exists(game.data.ratingResult);
    });
});
