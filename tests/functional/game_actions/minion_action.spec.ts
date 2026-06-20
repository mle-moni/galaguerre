import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertMinionActionScenario, runMinionAction } from "#tests/helpers/game/run_minion_action";
import { runInvalidMinionActionPayload } from "#tests/helpers/game/run_socket_event";
import {
    assertBothPlayersUpdated,
    assertOpponentHandHidden,
} from "#tests/helpers/game/socket_event_collector";

test.group("game:minion_action socket layer", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("rejects action when user has no active game", async ({ assert }) => {
        const result = await runMinionAction({
            data: createGameData(),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                minionUuid: null,
                owner: "OPPONENT",
            },
            expect: { error: "Vous n'êtes pas en jeu" },
            options: { outsider: true },
        });

        assertMinionActionScenario(assert, result, { error: "Vous n'êtes pas en jeu" });
    });

    test("rejects action when socket is not authenticated", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                minionUuid: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Une erreur est survenue, essayez de rafraichir la page",
            },
            options: { authenticated: false },
        });

        assertMinionActionScenario(assert, result, {
            error: "Une erreur est survenue, essayez de rafraichir la page",
        });
    });

    test("rejects action when game is already finished", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const result = await runMinionAction({
            data: createGameData({
                state: "FINISHED",
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                minionUuid: null,
                owner: "OPPONENT",
            },
            expect: { error: "Vous n'êtes pas en jeu" },
            isFinished: true,
        });

        assertMinionActionScenario(assert, result, { error: "Vous n'êtes pas en jeu" });
    });

    test("rejects invalid minion action payload", async ({ assert }) => {
        const errors = await runInvalidMinionActionPayload({
            minionId: "minion-1",
            minionUuid: null,
            owner: "INVALID",
        });

        assert.equal(errors.length, 1);
        assert.equal(errors[0], "Invalid data sent for event 'game:minion_action' :/");
    });

    test("hides opponent hand in game updates", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });
        const hiddenCard = createMinionCard({ uuid: "hidden-card", label: "Secret Card" });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                    hand: [hiddenCard],
                },
                playerTwo: {
                    hand: [createMinionCard({ uuid: "p2-card" })],
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                minionUuid: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertBothPlayersUpdated(assert);
        assertOpponentHandHidden(assert, result.actorUserId, result.game.data.playerTwo.userId, 1);
    });
});
