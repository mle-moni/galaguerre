import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertGameState } from "#tests/helpers/game/assertions";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";
import { assertPassTurnScenario, runPassTurn } from "#tests/helpers/game/run_pass_turn";

test.group("game:pass_turn", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

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
