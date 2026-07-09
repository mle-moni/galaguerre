import { test } from "@japa/runner";
import { assertGameState, assertPlayerHealth } from "#tests/helpers/game/assertions";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";
import { runPassTurnOnGame, runSetupNextTurn } from "#tests/helpers/game/run_setup_next_turn";

test.group("pass turn rules", () => {
    test("setupNextGameTurn sets turnEndsAt for the active turn", async ({ assert }) => {
        const before = Date.now();

        const { game } = await runSetupNextTurn(
            createGameData({
                state: "MULLIGAN",
                currentRound: 0,
                mulligan: { playerOneDone: true, playerTwoDone: true },
            }),
        );

        assert.isDefined(game.data.turnEndsAt);
        assert.isAbove(game.data.turnEndsAt!, before);
        assert.isBelow(game.data.turnEndsAt!, before + 106_000);
    });

    test("setupNextGameTurn transitions MULLIGAN to PLAYER_ONE_TURN", async ({ assert }) => {
        const { game } = await runSetupNextTurn(
            createGameData({
                state: "MULLIGAN",
                currentRound: 0,
                mulligan: { playerOneDone: true, playerTwoDone: true },
                playerOne: {
                    mana: 0,
                    deckCards: [createMinionCard({ uuid: "draw-1" })],
                    hand: [],
                },
            }),
        );

        assertGameState(assert, game, "PLAYER_ONE_TURN");
        assert.equal(game.data.currentRound, 1);
        assert.equal(game.data.playerOne.mana, 1);
        assert.equal(game.data.playerOne.hand.length, 1);
        assert.equal(game.data.playerOne.deckCards.length, 0);
    });

    test("pass_turn transitions PLAYER_ONE_TURN to PLAYER_TWO_TURN", async ({ assert }) => {
        const { game } = await runPassTurnOnGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerTwo: {
                    deckCards: [createMinionCard({ uuid: "p2-draw" })],
                    hand: [],
                },
            }),
        );

        assertGameState(assert, game, "PLAYER_TWO_TURN");
        assert.equal(game.data.currentRound, 1);
        assert.equal(game.data.playerTwo.hand.length, 1);
    });

    test("pass_turn transitions PLAYER_TWO_TURN to PLAYER_ONE_TURN and increments round", async ({
        assert,
    }) => {
        const { game } = await runPassTurnOnGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                playerOne: {
                    deckCards: [createMinionCard({ uuid: "p1-draw" })],
                    hand: [],
                },
            }),
        );

        assertGameState(assert, game, "PLAYER_ONE_TURN");
        assert.equal(game.data.currentRound, 3);
        assert.equal(game.data.playerOne.hand.length, 1);
    });

    test("draws a card from deck into hand", async ({ assert }) => {
        const drawCard = createMinionCard({ uuid: "draw-card", label: "Drawn Card" });

        const { game } = await runPassTurnOnGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerTwo: {
                    deckCards: [drawCard],
                    hand: [],
                },
            }),
        );

        assert.equal(game.data.playerTwo.hand.length, 1);
        assert.equal(game.data.playerTwo.hand[0]!.uuid, "draw-card");
        assert.equal(game.data.playerTwo.deckCards.length, 0);
    });

    test("sets mana to min of currentRound and 10", async ({ assert }) => {
        const { game } = await runPassTurnOnGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 12,
                playerOne: {
                    deckCards: [createMinionCard()],
                    hand: [],
                    mana: 0,
                },
            }),
        );

        assert.equal(game.data.playerOne.mana, 10);
    });

    test("applies escalating fatigue damage when deck is empty", async ({ assert }) => {
        const { game } = await runPassTurnOnGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 15,
                    maxFatigueDamageTaken: 0,
                },
            }),
        );

        assertPlayerHealth(assert, game, "playerTwo", 14);
        assert.equal(game.data.playerTwo.maxFatigueDamageTaken, 1);
    });

    test("applies increasing fatigue damage on consecutive empty draws", async ({ assert }) => {
        const { game } = await runSetupNextTurn(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 12,
                    maxFatigueDamageTaken: 2,
                },
            }),
        );

        assertPlayerHealth(assert, game, "playerTwo", 9);
        assert.equal(game.data.playerTwo.maxFatigueDamageTaken, 3);
    });
});
