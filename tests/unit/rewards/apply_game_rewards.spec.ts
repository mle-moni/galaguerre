import {
    GOLD_COINS_PER_DEFEAT,
    GOLD_COINS_PER_VICTORY,
    GOLD_COINS_TRAINING_VICTORY,
} from "#api_types/rewards.types";
import { terminateGame } from "#controllers/games/terminate_game";
import Game from "#models/game";
import User from "#models/user";
import UserDailyQuest from "#models/user_daily_quest";
import { applyGameRewards } from "#services/rewards/apply_game_rewards";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("apply game rewards", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("winner gets victory coins only", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await applyGameRewards(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(playerOne.goldCoins, GOLD_COINS_PER_DEFEAT);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);
        assert.equal(game.data.rewardResult?.playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(game.data.rewardResult?.playerOne.packs, 0);
    });

    test("loser gets defeat coins only", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 3 },
                playerTwo: { health: 0 },
            }),
        );

        await applyGameRewards(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(playerTwo.goldCoins, GOLD_COINS_PER_DEFEAT);
        assert.equal(game.data.rewardResult?.playerOne.packs, 0);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);
    });

    test("draw gives defeat coins to both players", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 0 },
            }),
        );

        await applyGameRewards(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.goldCoins, GOLD_COINS_PER_DEFEAT);
        assert.equal(playerTwo.goldCoins, GOLD_COINS_PER_DEFEAT);
        assert.equal(game.data.rewardResult?.playerOne.packs, 0);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);
    });

    test("training game rewards only the human player", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `rewards-train-${unique}@test.fr`,
            password: "test",
        });

        const data = bindUserIds(
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

        const game = await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data,
            isFinished: false,
        });

        await applyGameRewards(game);
        await human.refresh();

        assert.equal(human.goldCoins, GOLD_COINS_TRAINING_VICTORY);
        assert.equal(game.data.rewardResult?.playerOne.packs, 0);
        assert.equal(game.data.rewardResult?.playerTwo.goldCoins, 0);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);
    });

    test("short game gives no story points", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                actionLog: [{ id: "1", roundNumber: 1, playerId: 1, type: "ABANDON" }],
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await applyGameRewards(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.goldCoins, 0);
        assert.equal(playerTwo.goldCoins, 0);
        assert.equal(game.data.rewardResult?.playerOne.goldCoins, 0);
        assert.equal(game.data.rewardResult?.playerTwo.goldCoins, 0);
        assert.equal(game.data.rewardResult?.playerOne.packs, 0);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);
    });

    test("decisive turn-one game still earns story points", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                actionLog: [
                    { id: "1", roundNumber: 1, playerId: 1, type: "PLAY_CARD" },
                    { id: "2", roundNumber: 1, playerId: 1, type: "ATTACK" },
                    { id: "3", roundNumber: 1, playerId: 1, type: "ATTACK" },
                ],
                playerOne: { health: 5 },
                playerTwo: { health: 0 },
            }),
        );

        await applyGameRewards(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(playerTwo.goldCoins, GOLD_COINS_PER_DEFEAT);
    });

    test("terminateGame embeds rewardResult on ranked finish", async ({ assert }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );

        await terminateGame(game);
        await game.refresh();

        assert.exists(game.data.rewardResult);
        assert.equal(game.data.rewardResult!.playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(playerTwo.id, game.winnerId);

        const winQuest = await UserDailyQuest.query()
            .where("userId", playerTwo.id)
            .where("questType", "WIN_GAME")
            .first();

        assert.exists(winQuest);
        assert.equal(winQuest!.progress, 1);
        assert.isNotNull(winQuest!.completedAt);
    });
});
