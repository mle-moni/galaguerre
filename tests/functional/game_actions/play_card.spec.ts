import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { CARD_IDS, createGameData, createMinionCard } from "#tests/helpers/game/fixtures";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";
import { runInvalidPlayCardPayload } from "#tests/helpers/game/run_socket_event";

test.group("game:play_card socket layer", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("rejects play when user has no active game", async ({ assert }) => {
        const result = await runPlayCard({
            data: createGameData(),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
            expect: { error: "Vous n'êtes pas en jeu" },
            options: { outsider: true },
        });

        assertPlayCardScenario(assert, result, { error: "Vous n'êtes pas en jeu" });
    });

    test("rejects play when socket is not authenticated", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
            expect: {
                error: "Une erreur est survenue, essayez de rafraichir la page",
            },
            options: { authenticated: false },
        });

        assertPlayCardScenario(assert, result, {
            error: "Une erreur est survenue, essayez de rafraichir la page",
        });
    });

    test("rejects invalid play card payload", async ({ assert }) => {
        const errors = await runInvalidPlayCardPayload({
            cardId: "card-1",
            boardIndex: 99,
            owner: "PLAYER",
        });

        assert.equal(errors.length, 1);
        assert.equal(errors[0], "Invalid data sent for event 'game:play_card' :/");
    });
});
