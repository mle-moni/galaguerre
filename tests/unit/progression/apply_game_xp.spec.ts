import {
    XP_RANKED_DEFEAT,
    XP_RANKED_VICTORY,
    XP_TRAINING_DEFEAT,
    XP_TRAINING_VICTORY,
} from "#api_types/progression";
import Game from "#models/game";
import User from "#models/user";
import { applyGameXp } from "#services/progression/apply_game_xp";
import { backfillUserXp } from "#services/progression/backfill_user_xp";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("apply game xp", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("ranked winner gets 400 xp", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await applyGameXp(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerTwo.xp, XP_RANKED_VICTORY);
        assert.equal(playerOne.xp, XP_RANKED_DEFEAT);
        assert.equal(game.data.xpResult?.playerTwo.xp, XP_RANKED_VICTORY);
        assert.equal(game.data.xpResult?.playerOne.xp, XP_RANKED_DEFEAT);
    });

    test("training defeat gives 25 xp to human only", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `xp-train-${unique}@test.fr`,
            password: "test",
        });

        const data = bindUserIds(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                isTraining: true,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
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

        await applyGameXp(game);
        await human.refresh();

        assert.equal(human.xp, XP_TRAINING_DEFEAT);
        assert.equal(game.data.xpResult?.playerOne.xp, XP_TRAINING_DEFEAT);
        assert.equal(game.data.xpResult?.playerTwo.xp, 0);
    });

    test("short game gives no xp", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                actionLog: [{ id: "1", roundNumber: 1, playerId: 1, type: "ABANDON" }],
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await applyGameXp(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.xp, 0);
        assert.equal(playerTwo.xp, 0);
        assert.equal(game.data.xpResult?.playerOne.xp, 0);
        assert.equal(game.data.xpResult?.playerTwo.xp, 0);
    });

    test("onboarding tutorial gives no xp", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                isOnboardingTutorial: true,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await applyGameXp(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.xp, 0);
        assert.equal(playerTwo.xp, 0);
    });

    test("backfill aggregates xp from finished games", async ({ assert }) => {
        const {
            game: rankedWin,
            playerOne,
            playerTwo,
        } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
            { isFinished: true },
        );

        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `xp-backfill-${unique}@test.fr`,
            password: "test",
        });

        const trainingData = bindUserIds(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                isTraining: true,
                playerOne: { health: 5 },
                playerTwo: { health: 0 },
            }),
            human.id,
            TRAINING_AI_USER_ID,
        );

        await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data: trainingData,
            isFinished: true,
        });

        await backfillUserXp();

        await playerOne.refresh();
        await playerTwo.refresh();
        await human.refresh();

        assert.equal(playerOne.xp, XP_RANKED_DEFEAT);
        assert.equal(playerTwo.xp, XP_RANKED_VICTORY);
        assert.equal(human.xp, XP_TRAINING_VICTORY);
        void rankedWin;
    });
});
