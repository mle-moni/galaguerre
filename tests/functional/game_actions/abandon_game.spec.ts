import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import Game from "#models/game";
import User from "#models/user";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { DEFAULT_ELO } from "#services/elo";
import { assertGameState, assertPlayerHealth } from "#tests/helpers/game/assertions";
import { bindUserIds, createTestUsers } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";
import {
    assertAbandonGameScenario,
    runAbandonGame,
    runAbandonGameOnGame,
} from "#tests/helpers/game/run_abandon_game";

test.group("game:abandon", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("player one abandons on their turn — opponent wins with Elo update", async ({
        assert,
    }) => {
        const result = await runAbandonGame({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                playerOne: { health: 20 },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            expect: { error: null, isFinished: true },
        });

        assertAbandonGameScenario(assert, result, { error: null, isFinished: true });
        assertPlayerHealth(assert, result.game, "playerOne", 0);
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
        assert.equal(result.game.winnerId, result.game.playerTwoId);
        assert.isDefined(result.game.data.ratingResult);

        const playerOne = await User.findOrFail(result.game.playerOneId);
        const playerTwo = await User.findOrFail(result.game.playerTwoId!);
        assert.isBelow(playerOne.elo, DEFAULT_ELO);
        assert.isAbove(playerTwo.elo, DEFAULT_ELO);
        assert.equal(playerOne.losses, 1);
        assert.equal(playerTwo.wins, 1);

        const abandonEntry = result.game.data.actionLog.find((e) => e.type === "ABANDON");
        assert.isDefined(abandonEntry);
        assert.equal(abandonEntry!.playerId, result.actorUserId);
    });

    test("player abandons on opponent turn — still finishes game", async ({ assert }) => {
        const result = await runAbandonGame({
            data: createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                playerOne: { health: 20 },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            expect: { error: null, isFinished: true },
        });

        assertAbandonGameScenario(assert, result, { error: null, isFinished: true });
        assertPlayerHealth(assert, result.game, "playerOne", 0);
        assert.equal(result.game.winnerId, result.game.playerTwoId);
    });

    test("training game abandon skips Elo", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `abandon-train-${unique}@test.fr`,
            password: "test",
            elo: 1200,
            wins: 0,
            losses: 0,
        });

        const data = bindUserIds(
            createGameData({
                state: "PLAYER_ONE_TURN",
                isTraining: true,
                playerOne: { health: 20 },
                playerTwo: { health: 30 },
            }),
            human.id,
            TRAINING_AI_USER_ID,
        );

        const game = await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data,
            isFinished: false,
        });

        const result = await runAbandonGameOnGame(game, human.id);

        assertAbandonGameScenario(assert, result, { error: null, isFinished: true });
        assert.isUndefined(result.game.data.ratingResult);
        assert.equal(result.game.winnerId, null);

        await human.refresh();
        assert.equal(human.elo, 1200);
        assert.equal(human.wins, 0);
        assert.equal(human.losses, 0);
    });

    test("already finished game cannot be abandoned again", async ({ assert }) => {
        const { playerOne, playerTwo } = await createTestUsers();
        const boundData = bindUserIds(
            createGameData({
                state: "FINISHED",
                playerOne: { health: 0 },
                playerTwo: { health: 20 },
            }),
            playerOne.id,
            playerTwo.id,
        );

        const game = await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data: boundData,
            isFinished: true,
        });

        await playerOne.merge({ elo: 1200, wins: 1, losses: 0 }).save();
        await playerTwo.merge({ elo: 1200, wins: 0, losses: 1 }).save();

        const result = await runAbandonGameOnGame(game, playerOne.id);

        assertAbandonGameScenario(assert, result, { error: "Vous n'êtes pas en jeu" });

        await playerOne.refresh();
        await playerTwo.refresh();
        assert.equal(playerOne.elo, 1200);
        assert.equal(playerTwo.elo, 1200);
        assert.equal(playerOne.wins, 1);
        assert.equal(playerTwo.losses, 1);
    });

    test("rejects abandon when user has no active game", async ({ assert }) => {
        const result = await runAbandonGame({
            data: createGameData({ state: "PLAYER_ONE_TURN" }),
            actor: "playerOne",
            expect: { error: "Vous n'êtes pas en jeu" },
            options: { outsider: true },
        });

        assertAbandonGameScenario(assert, result, { error: "Vous n'êtes pas en jeu" });
    });

    test("rejects abandon when socket is not authenticated", async ({ assert }) => {
        const result = await runAbandonGame({
            data: createGameData({ state: "PLAYER_ONE_TURN" }),
            actor: "playerOne",
            expect: { error: "Une erreur est survenue, essayez de rafraichir la page" },
            options: { authenticated: false },
        });

        assertAbandonGameScenario(assert, result, {
            error: "Une erreur est survenue, essayez de rafraichir la page",
        });
    });

    test("rejects abandon from training AI", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `abandon-ai-${unique}@test.fr`,
            password: "test",
        });

        const data = bindUserIds(
            createGameData({
                state: "PLAYER_TWO_TURN",
                isTraining: true,
            }),
            human.id,
            TRAINING_AI_USER_ID,
        );

        const game = await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data,
            isFinished: false,
        });

        const result = await runAbandonGameOnGame(game, TRAINING_AI_USER_ID, { ai: true });

        assertAbandonGameScenario(assert, result, { error: "Action non autorisée" });
        assertGameState(assert, result.game, "PLAYER_TWO_TURN");
        assert.isFalse(result.game.isFinished);
    });
});
