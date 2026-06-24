import { GOLD_COINS_PER_DEFEAT, GOLD_COINS_PER_VICTORY } from "#api_types/rewards.types";
import { terminateGame } from "#controllers/games/terminate_game";
import CardPack from "#models/card_pack";
import Game from "#models/game";
import User from "#models/user";
import { applyGameRewards } from "#services/rewards/apply_game_rewards";
import {
    getParisCalendarDate,
    parseParisCalendarDate,
} from "#services/rewards/get_paris_calendar_date";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("apply game rewards", (group) => {
    group.setup(() => testUtils.db().migrate());
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("winner gets victory grains and first victory pack of the day", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await applyGameRewards(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(playerOne.goldCoins, GOLD_COINS_PER_DEFEAT);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 1);
        assert.equal(game.data.rewardResult?.playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(game.data.rewardResult?.playerOne.packs, 0);

        const winnerPacks = await CardPack.query()
            .where("userId", playerTwo.id)
            .whereNull("openedAt")
            .count("* as total");
        assert.equal(Number(winnerPacks[0].$extras.total), 1);
    });

    test("loser gets defeat grains only", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 3 },
                playerTwo: { health: 0 },
            }),
        );

        await applyGameRewards(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(playerTwo.goldCoins, GOLD_COINS_PER_DEFEAT);
        assert.equal(game.data.rewardResult?.playerOne.packs, 1);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);
    });

    test("draw gives defeat grains to both players", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
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

    test("second victory of the day does not grant another pack", async ({ assert }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await playerTwo
            .merge({
                lastVictoryPackGrantedOn: parseParisCalendarDate(getParisCalendarDate()),
            })
            .save();

        await applyGameRewards(game);
        await playerTwo.refresh();

        assert.equal(playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);

        const winnerPacks = await CardPack.query()
            .where("userId", playerTwo.id)
            .whereNull("openedAt")
            .count("* as total");
        assert.equal(Number(winnerPacks[0].$extras.total), 0);
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

        assert.equal(human.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(game.data.rewardResult?.playerOne.packs, 1);
        assert.equal(game.data.rewardResult?.playerTwo.goldCoins, 0);
        assert.equal(game.data.rewardResult?.playerTwo.packs, 0);
    });

    test("terminateGame embeds rewardResult on ranked finish", async ({ assert }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );

        await terminateGame(game);
        await game.refresh();

        assert.exists(game.data.rewardResult);
        assert.equal(game.data.rewardResult!.playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(playerTwo.id, game.winnerId);
    });
});
