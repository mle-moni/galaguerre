import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertGameState, assertPlayerHealth } from "#tests/helpers/game/assertions";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";
import {
    assertPassTurnScenario,
    runPassTurn,
    runSetupNextTurnOnGame,
} from "#tests/helpers/game/run_pass_turn";

test.group("game:pass_turn", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("setupNextGameTurn transitions INIT to PLAYER_ONE_TURN", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "INIT",
                currentRound: 0,
                playerOne: {
                    mana: 0,
                    deckCards: [createMinionCard({ uuid: "draw-1" })],
                    hand: [],
                },
            }),
        );

        const result = await runSetupNextTurnOnGame(game);

        assertGameState(assert, result.game, "PLAYER_ONE_TURN");
        assert.equal(result.game.data.currentRound, 1);
        assert.equal(result.game.data.playerOne.mana, 1);
        assert.equal(result.game.data.playerOne.hand.length, 1);
        assert.equal(result.game.data.playerOne.deckCards.length, 0);
    });

    test("pass_turn transitions PLAYER_ONE_TURN to PLAYER_TWO_TURN", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerTwo: {
                    deckCards: [createMinionCard({ uuid: "p2-draw" })],
                    hand: [],
                },
            }),
            actor: "playerOne",
            expect: { error: null },
        });

        assertPassTurnScenario(assert, result, { error: null });
        assertGameState(assert, result.game, "PLAYER_TWO_TURN");
        assert.equal(result.game.data.currentRound, 1);
        assert.equal(result.game.data.playerTwo.hand.length, 1);
    });

    test("pass_turn transitions PLAYER_TWO_TURN to PLAYER_ONE_TURN and increments round", async ({
        assert,
    }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                playerOne: {
                    deckCards: [createMinionCard({ uuid: "p1-draw" })],
                    hand: [],
                },
            }),
            actor: "playerTwo",
            expect: { error: null },
        });

        assertPassTurnScenario(assert, result, { error: null });
        assertGameState(assert, result.game, "PLAYER_ONE_TURN");
        assert.equal(result.game.data.currentRound, 3);
        assert.equal(result.game.data.playerOne.hand.length, 1);
    });

    test("draws a card from deck into hand", async ({ assert }) => {
        const drawCard = createMinionCard({ uuid: "draw-card", label: "Drawn Card" });

        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerTwo: {
                    deckCards: [drawCard],
                    hand: [],
                },
            }),
            actor: "playerOne",
            expect: { error: null },
        });

        assert.equal(result.game.data.playerTwo.hand.length, 1);
        assert.equal(result.game.data.playerTwo.hand[0]!.uuid, "draw-card");
        assert.equal(result.game.data.playerTwo.deckCards.length, 0);
    });

    test("sets mana to min of currentRound and 10", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 12,
                playerOne: {
                    deckCards: [createMinionCard()],
                    hand: [],
                    mana: 0,
                },
            }),
            actor: "playerTwo",
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.mana, 10);
    });

    test("applies escalating fatigue damage when deck is empty", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 15,
                    maxFatigueDamageTaken: 0,
                },
            }),
            actor: "playerOne",
            expect: { error: null },
        });

        assertPlayerHealth(assert, result.game, "playerTwo", 14);
        assert.equal(result.game.data.playerTwo.maxFatigueDamageTaken, 1);
    });

    test("applies increasing fatigue damage on consecutive empty draws", async ({ assert }) => {
        const { game } = await createTestGame(
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

        const result = await runSetupNextTurnOnGame(game);

        assertPlayerHealth(assert, result.game, "playerTwo", 9);
        assert.equal(result.game.data.playerTwo.maxFatigueDamageTaken, 3);
    });

    test("terminates game when fatigue is lethal", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 1,
                    maxFatigueDamageTaken: 0,
                },
            }),
            actor: "playerOne",
            expect: { error: null, isFinished: true },
        });

        assertPassTurnScenario(assert, result, { error: null, isFinished: true });
        assertPlayerHealth(assert, result.game, "playerTwo", 0);
    });

    test("rejects pass_turn when it is not the player turn", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
            }),
            actor: "playerTwo",
            expect: {
                error: "Ce n'est pas votre tour (gros con)",
            },
        });

        assertPassTurnScenario(assert, result, {
            error: "Ce n'est pas votre tour (gros con)",
        });
    });

    test("rejects pass_turn when user has no active game", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData(),
            actor: "playerOne",
            expect: { error: "Vous n'êtes pas en jeu" },
            options: { outsider: true },
        });

        assertPassTurnScenario(assert, result, { error: "Vous n'êtes pas en jeu" });
    });

    test("rejects pass_turn when socket is not authenticated", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData(),
            actor: "playerOne",
            expect: {
                error: "Une erreur est survenue, essayez de rafraichir la page",
            },
            options: { authenticated: false },
        });

        assertPassTurnScenario(assert, result, {
            error: "Une erreur est survenue, essayez de rafraichir la page",
        });
    });
});
