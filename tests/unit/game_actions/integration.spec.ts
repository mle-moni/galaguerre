import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import {
    assertBoardSpot,
    assertGameState,
    assertIsFinished,
    assertPlayerHealth,
} from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createGameData,
    createMinionCard,
    createMinionState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import {
    runMinionActionInMemory,
    runMinionActionOnGameInMemory,
} from "#tests/helpers/game/run_minion_action_in_memory";
import { runPlayMinion, runPlayMinionOnGame } from "#tests/helpers/game/run_play_minion";
import { runPassTurnFromGame } from "#tests/helpers/game/run_setup_next_turn";
import { assertError } from "#tests/helpers/game/socket_event_collector";

test.group("game scenarios", () => {
    test("full turn: play minion, attack, pass turn, opponent plays", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            attack: 2,
            health: 2,
            hasCharge: true,
            effects: ["Charge"],
        });
        const opponentHandCard = createMinionCard({
            uuid: "p2-hand",
            cost: 1,
        });

        const { game: playGame } = await runPlayMinion(
            createGameData({
                currentRound: 3,
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
                playerTwo: {
                    mana: 10,
                    hand: [opponentHandCard],
                },
            }),
            handCard,
        );

        assertBoardSpot(assert, playGame, "playerOne", "SPOT_1", { health: 2 });

        const { game: attackGame, errors: attackErrors } = await runMinionActionOnGameInMemory(
            playGame,
            "playerOne",
            {
                minionId: CARD_IDS.handMinion,
                spotId: null,
                owner: "OPPONENT",
            },
        );

        assert.equal(attackErrors.length, 0);
        assertPlayerHealth(assert, attackGame, "playerTwo", DEFAULT_HERO_HEALTH - 2);

        const { game: passGame } = await runPassTurnFromGame(attackGame);

        assertGameState(assert, passGame, "PLAYER_TWO_TURN");

        const { game: opponentPlayGame } = await runPlayMinionOnGame(passGame, opponentHandCard, {
            spotId: "SPOT_2",
            actor: "playerTwo",
        });

        assertBoardSpot(assert, opponentPlayGame, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("win by combat: charge minion attacks hero and finishes the game", async ({ assert }) => {
        const chargeCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 10,
            attack: DEFAULT_HERO_HEALTH,
            health: 1,
            hasCharge: true,
            effects: ["Charge"],
        });

        const { game: playGame } = await runPlayMinion(
            createGameData({
                currentRound: 10,
                playerOne: {
                    mana: 10,
                    hand: [chargeCard],
                },
            }),
            chargeCard,
        );

        const { game: attackGame } = await runMinionActionOnGameInMemory(playGame, "playerOne", {
            minionId: CARD_IDS.handMinion,
            spotId: null,
            owner: "OPPONENT",
        });

        assertIsFinished(assert, attackGame, true);
        assertPlayerHealth(assert, attackGame, "playerTwo", 0);
    });

    test("win by fatigue after deck is exhausted", async ({ assert }) => {
        let game = createInMemoryGame({
            ...createGameData({
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
            isTraining: true,
        });

        for (let turn = 0; turn < 4; turn++) {
            const { game: nextGame } = await runPassTurnFromGame(game);
            game = nextGame;

            if (game.isFinished) {
                assertIsFinished(assert, game, true);
                assertPlayerHealth(assert, game, "playerTwo", 0);
                return;
            }
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

        const blocked = await runMinionActionInMemory(
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
            "playerOne",
            {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
        );

        assertError(assert, "Vous devez d'abord attaquer un serviteur avec Provocation");
        assertPlayerHealth(assert, blocked.game, "playerTwo", DEFAULT_HERO_HEALTH);

        const killTaunt = await runMinionActionOnGameInMemory(blocked.game, "playerOne", {
            minionId: MINION_IDS.attacker,
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assert.equal(killTaunt.errors.length, 0);
        assertBoardSpot(assert, killTaunt.game, "playerTwo", "SPOT_1", null);

        const heroAttack = await runMinionActionOnGameInMemory(killTaunt.game, "playerOne", {
            minionId: "minion-finisher",
            spotId: null,
            owner: "OPPONENT",
        });

        assert.equal(heroAttack.errors.length, 0);
        assertPlayerHealth(assert, heroAttack.game, "playerTwo", DEFAULT_HERO_HEALTH - 3);

        const { game: passGame } = await runPassTurnFromGame(heroAttack.game);
        assertGameState(assert, passGame, "PLAYER_TWO_TURN");
    });
});
