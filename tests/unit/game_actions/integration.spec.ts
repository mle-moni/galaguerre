import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createGameData,
    createMinionCard,
    createMinionState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import {
    assertMinionActionScenario,
    runMinionAction,
    runMinionActionOnGame,
} from "#tests/helpers/game/run_minion_action";
import { assertPlayCardScenario, runPlayCardOnGame } from "#tests/helpers/game/run_play_card";
import { assertPassTurnScenario, runPassTurnOnGame } from "#tests/helpers/game/run_pass_turn";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { assertError } from "#tests/helpers/game/socket_event_collector";

test.group("game:integration", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("full turn: play minion, attack, pass turn, opponent plays", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            attack: 2,
            health: 2,
            hasCharge: true,
            effects: ["Charge"],
        });

        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                currentRound: 3,
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
                playerTwo: {
                    mana: 10,
                    hand: [
                        createMinionCard({
                            uuid: "p2-hand",
                            cost: 1,
                        }),
                    ],
                },
            }),
        );

        const playResult = await runPlayCardOnGame(game, playerOne.id, {
            cardId: CARD_IDS.handMinion,
            spotId: "SPOT_1",
            owner: "PLAYER",
        });

        assertPlayCardScenario(assert, playResult, { error: null });
        assertBoardSpot(assert, playResult.game, "playerOne", "SPOT_1", { health: 2 });

        const attackResult = await runMinionActionOnGame(playResult.game, playerOne.id, {
            minionId: CARD_IDS.handMinion,
            spotId: null,
            owner: "OPPONENT",
        });

        assertMinionActionScenario(assert, attackResult, { error: null });
        assertPlayerHealth(assert, attackResult.game, "playerTwo", 13);

        const passResult = await runPassTurnOnGame(attackResult.game, playerOne.id);

        assertPassTurnScenario(assert, passResult, { error: null });
        assert.equal(passResult.game.data.state, "PLAYER_TWO_TURN");

        const opponentPlay = await runPlayCardOnGame(passResult.game, playerTwo.id, {
            cardId: "p2-hand",
            spotId: "SPOT_2",
            owner: "PLAYER",
        });

        assertPlayCardScenario(assert, opponentPlay, { error: null });
        assertBoardSpot(assert, opponentPlay.game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("win by combat: charge minion attacks hero and finishes the game", async ({ assert }) => {
        const chargeCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 10,
            attack: 15,
            health: 1,
            hasCharge: true,
            effects: ["Charge"],
        });

        const { game, playerOne } = await createTestGame(
            createGameData({
                currentRound: 10,
                playerOne: {
                    mana: 10,
                    hand: [chargeCard],
                },
            }),
        );

        const playResult = await runPlayCardOnGame(game, playerOne.id, {
            cardId: CARD_IDS.handMinion,
            spotId: "SPOT_1",
            owner: "PLAYER",
        });

        const attackResult = await runMinionActionOnGame(playResult.game, playerOne.id, {
            minionId: CARD_IDS.handMinion,
            spotId: null,
            owner: "OPPONENT",
        });

        assertMinionActionScenario(assert, attackResult, { error: null, isFinished: true });
        assertPlayerHealth(assert, attackResult.game, "playerTwo", 0);
    });

    test("win by fatigue after deck is exhausted", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerOne: {
                    deckCards: [],
                    hand: [],
                },
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 3,
                    maxFatigueDamageTaken: 0,
                },
            }),
        );

        let currentGame = game;
        let actorId = playerOne.id;

        for (let turn = 0; turn < 4; turn++) {
            const passResult = await runPassTurnOnGame(currentGame, actorId);
            currentGame = passResult.game;

            if (passResult.game.isFinished) {
                assert.isTrue(passResult.game.isFinished);
                assertPlayerHealth(assert, passResult.game, "playerTwo", 0);
                return;
            }

            actorId = actorId === playerOne.id ? playerTwo.id : playerOne.id;
        }

        assert.fail("Expected game to finish from fatigue damage");
    });

    test("taunt blocks hero attack until taunt minion is dealt with", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
        });
        const finisherCard = createMinionCard({
            uuid: "minion-finisher",
            attack: 3,
            health: 3,
            hasCharge: true,
            effects: ["Charge"],
        });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            attack: 1,
            health: 2,
            hasTaunt: true,
            effects: ["Provocation"],
        });

        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                currentRound: 4,
                playerOne: {
                    board: {
                        ...placeMinion(
                            createGameData().playerOne.board,
                            "SPOT_1",
                            createMinionState(attackerCard),
                        ),
                        SPOT_2: createMinionState(finisherCard, { placedAtRound: 4 }),
                    },
                    hand: [],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(tauntCard),
                    ),
                },
            }),
        );

        const blocked = await runMinionActionOnGame(game, playerOne.id, {
            minionId: MINION_IDS.attacker,
            spotId: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Vous devez d'abord attaquer un serviteur avec Provocation");
        assertPlayerHealth(assert, blocked.game, "playerTwo", 15);

        const killTaunt = await runMinionActionOnGame(blocked.game, playerOne.id, {
            minionId: MINION_IDS.attacker,
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertMinionActionScenario(assert, killTaunt, { error: null });
        assertBoardSpot(assert, killTaunt.game, "playerTwo", "SPOT_1", null);

        const heroAttack = await runMinionActionOnGame(killTaunt.game, playerOne.id, {
            minionId: "minion-finisher",
            spotId: null,
            owner: "OPPONENT",
        });

        assertMinionActionScenario(assert, heroAttack, { error: null });
        assertPlayerHealth(assert, heroAttack.game, "playerTwo", 12);

        const opponentPass = await runPassTurnOnGame(heroAttack.game, playerOne.id);
        assert.equal(opponentPass.game.data.state, "PLAYER_TWO_TURN");
    });
});
