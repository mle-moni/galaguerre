import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { GOLD_COINS_PER_DEFEAT, GOLD_COINS_PER_VICTORY } from "#api_types/rewards.types";
import { computePlayerXpGain } from "#api_types/progression";
import { terminateGame } from "#controllers/games/terminate_game";
import Game from "#models/game";
import User from "#models/user";
import UserDailyQuest from "#models/user_daily_quest";
import { applyGameResult, computeEloDeltas, DEFAULT_ELO, getWinnerUserId } from "#services/elo";
import { getOrGenerateDailyQuests } from "#services/daily_quests/get_or_generate_daily_quests";
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
        game.data.postGameProgressionApplied = true;
        await game.save();

        await terminateGame(game);

        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerOne.wins, 0);
        assert.equal(playerTwo.wins, 0);
        assert.equal(playerOne.elo, DEFAULT_ELO);
        assert.equal(playerTwo.elo, DEFAULT_ELO);
    });

    test("double terminateGame from separate instances applies progression once", async ({
        assert,
    }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );

        const gameInstanceOne = await game.refresh();
        const gameInstanceTwo = await Game.findOrFail(game.id);

        await terminateGame(gameInstanceOne);
        await terminateGame(gameInstanceTwo);

        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerTwo.wins, 1);
        assert.equal(playerOne.losses, 1);
        assert.equal(playerOne.wins, 0);
        assert.equal(playerTwo.losses, 0);
    });

    test("terminateGame applies elo on first finish", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
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
        assert.isNotNull(game.endedAt);
        assert.equal(game.winnerId, playerTwo.id);
        assert.equal(playerTwo.wins, 1);
        assert.equal(playerOne.losses, 1);
        assert.exists(game.data.ratingResult);
        assert.exists(game.data.rewardResult);
        assert.equal(game.data.rewardResult!.playerTwo.goldCoins, GOLD_COINS_PER_VICTORY);
        assert.equal(game.data.rewardResult!.playerOne.goldCoins, GOLD_COINS_PER_DEFEAT);
    });

    test("friendly games finish without any progression", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                isFriendly: true,
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );

        const playerOneQuest = (await getOrGenerateDailyQuests(playerOne.id)).find(
            (quest) => quest.questType === "WIN_GAME",
        )!;
        const playerTwoQuest = (await getOrGenerateDailyQuests(playerTwo.id)).find(
            (quest) => quest.questType === "WIN_GAME",
        )!;
        const before = {
            playerOne: { elo: playerOne.elo, wins: playerOne.wins, losses: playerOne.losses, goldCoins: playerOne.goldCoins, xp: playerOne.xp },
            playerTwo: { elo: playerTwo.elo, wins: playerTwo.wins, losses: playerTwo.losses, goldCoins: playerTwo.goldCoins, xp: playerTwo.xp },
            playerOneQuest: playerOneQuest.progress,
            playerTwoQuest: playerTwoQuest.progress,
        };

        await terminateGame(game, { skipSendUpdate: true });
        await game.refresh();
        await playerOne.refresh();
        await playerTwo.refresh();
        await playerOneQuest.refresh();
        await playerTwoQuest.refresh();

        assert.equal(game.winnerId, playerTwo.id);
        assert.isTrue(game.data.postGameProgressionApplied);
        assert.isUndefined(game.data.ratingResult);
        assert.isUndefined(game.data.rewardResult);
        assert.isUndefined(game.data.xpResult);
        assert.isUndefined(game.data.dailyQuestProgressApplied);
        assert.deepEqual(
            {
                elo: playerOne.elo,
                wins: playerOne.wins,
                losses: playerOne.losses,
                goldCoins: playerOne.goldCoins,
                xp: playerOne.xp,
            },
            before.playerOne,
        );
        assert.deepEqual(
            {
                elo: playerTwo.elo,
                wins: playerTwo.wins,
                losses: playerTwo.losses,
                goldCoins: playerTwo.goldCoins,
                xp: playerTwo.xp,
            },
            before.playerTwo,
        );
        assert.equal(playerOneQuest.progress, before.playerOneQuest);
        assert.equal(playerTwoQuest.progress, before.playerTwoQuest);
    });

    test("applyGameResult is idempotent", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );

        await applyGameResult(game);
        await game.save();
        await applyGameResult(game);
        await game.save();

        await playerOne.refresh();
        await playerTwo.refresh();

        assert.equal(playerTwo.wins, 1);
        assert.equal(playerOne.losses, 1);
    });

    test("terminateGame completes missing progression on already finished game", async ({
        assert,
    }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );

        game.isFinished = true;
        game.endedAt = game.createdAt;
        await game.save();

        await terminateGame(game);

        await game.refresh();
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.isTrue(game.data.postGameProgressionApplied);
        assert.equal(playerTwo.wins, 1);
        assert.equal(playerOne.losses, 1);
        assert.exists(game.data.ratingResult);
        assert.exists(game.data.rewardResult);
    });
});

test.group("game termination concurrency", (group) => {
    let gameId: number | undefined;
    let userIds: number[] = [];

    group.each.teardown(async () => {
        if (gameId !== undefined) {
            await Game.query().where("id", gameId).delete();
        }
        if (userIds.length > 0) {
            await User.query().whereIn("id", userIds).delete();
        }
    });
    test("applies one match of progression across concurrent termination attempts", async ({
        assert,
    }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
        );
        gameId = game.id;
        userIds = [playerOne.id, playerTwo.id];
        await playerOne.refresh();
        await playerTwo.refresh();
        const winnerQuest = (await getOrGenerateDailyQuests(playerTwo.id)).find(
            (quest) => quest.questType === "WIN_GAME",
        )!;
        const before = {
            playerOne: {
                elo: playerOne.elo,
                goldCoins: playerOne.goldCoins,
                xp: playerOne.xp,
            },
            playerTwo: {
                elo: playerTwo.elo,
                goldCoins: playerTwo.goldCoins,
                xp: playerTwo.xp,
            },
            winnerQuestProgress: winnerQuest.progress,
        };
        const { winnerDelta, loserDelta } = computeEloDeltas(
            before.playerTwo.elo,
            before.playerOne.elo,
        );

        const gameInstances = await Promise.all(
            Array.from({ length: 8 }, () => Game.findOrFail(game.id)),
        );
        await Promise.all(
            gameInstances.map((gameInstance) =>
                terminateGame(gameInstance, { skipSendUpdate: true }),
            ),
        );

        const persistedGame = await Game.findOrFail(game.id);
        await playerOne.refresh();
        await playerTwo.refresh();
        const persistedWinnerQuest = await UserDailyQuest.findOrFail(winnerQuest.id);

        assert.equal(playerTwo.goldCoins, before.playerTwo.goldCoins + GOLD_COINS_PER_VICTORY);
        assert.equal(playerOne.goldCoins, before.playerOne.goldCoins + GOLD_COINS_PER_DEFEAT);
        assert.equal(
            playerTwo.xp,
            before.playerTwo.xp +
                computePlayerXpGain({ isWinner: true, isDraw: false, isTraining: false }),
        );
        assert.equal(
            playerOne.xp,
            before.playerOne.xp +
                computePlayerXpGain({ isWinner: false, isDraw: false, isTraining: false }),
        );
        assert.equal(playerTwo.wins, 1);
        assert.equal(playerOne.losses, 1);
        assert.equal(playerTwo.elo, before.playerTwo.elo + winnerDelta);
        assert.equal(playerOne.elo, before.playerOne.elo + loserDelta);
        assert.equal(persistedGame.data.ratingResult!.playerTwo.delta, winnerDelta);
        assert.equal(persistedGame.data.ratingResult!.playerOne.delta, loserDelta);
        assert.equal(persistedWinnerQuest.progress, before.winnerQuestProgress + 1);
        assert.isTrue(persistedGame.data.dailyQuestProgressApplied);
        assert.isTrue(persistedGame.data.postGameProgressionApplied);
    });

    test("terminateGame applies progression from in-memory terminal board state", async ({
        assert,
    }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                playerOne: { health: 30 },
                playerTwo: { health: 5 },
            }),
        );

        game.data.playerOne.health = 0;

        await terminateGame(game, { skipSendUpdate: true });
        await game.refresh();

        assert.equal(getWinnerUserId(game), playerTwo.id);
        assert.equal(game.winnerId, playerTwo.id);
        assert.equal(game.data.playerOne.health, 0);
    });
});
