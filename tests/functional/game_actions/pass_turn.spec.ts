import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { createGameData } from "#tests/helpers/game/fixtures";
import { assertPassTurnScenario, runPassTurn } from "#tests/helpers/game/run_pass_turn";

test.group("game:pass_turn socket layer", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

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
