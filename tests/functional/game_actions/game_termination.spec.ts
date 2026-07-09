import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertIsFinished, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import {
    runMinionCombatOnGame,
    runMinionCombatOnPersistedGame,
    runPassTurnOnGame,
    runPassTurnOnPersistedGame,
    runPlayMinionOnPersistedGame,
} from "#tests/helpers/game/run_persisted_game_actions";
import { createTestGame } from "#tests/helpers/game/game_factory";

test.group("game termination", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("lethal hero attack terminates the game", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: DEFAULT_HERO_HEALTH,
            health: 1,
        });

        const { game } = await runMinionCombatOnPersistedGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", 0);
        assertIsFinished(assert, game, true);
    });

    test("deathrattle that reduces hero to zero ends the game", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: DEFAULT_HERO_HEALTH,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = await runMinionCombatOnPersistedGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertIsFinished(assert, game, true);
        assertPlayerHealth(assert, game, "playerOne", 0);
    });

    test("win by combat: charge minion attacks hero and finishes the game", async ({ assert }) => {
        const chargeCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 10,
            attack: DEFAULT_HERO_HEALTH,
            health: 1,
            minionPowers: { hasCharge: true },
            effects: ["Charge"],
        });

        const { game: playGame } = await runPlayMinionOnPersistedGame(
            createGameData({
                currentRound: 10,
                playerOne: {
                    mana: 10,
                    hand: [chargeCard],
                },
            }),
            chargeCard,
        );

        const { game: attackGame } = await runMinionCombatOnGame(playGame, { heroAttack: true });

        assertIsFinished(assert, attackGame, true);
        assertPlayerHealth(assert, attackGame, "playerTwo", 0);
    });

    test("terminates game when fatigue is lethal", async ({ assert }) => {
        const { game } = await runPassTurnOnPersistedGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 1,
                    maxFatigueDamageTaken: 0,
                },
            }),
        );

        assertIsFinished(assert, game, true);
        assertPlayerHealth(assert, game, "playerTwo", 0);
    });

    test("win by fatigue after deck is exhausted", async ({ assert }) => {
        const { game: initialGame } = await createTestGame(
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

        let game = initialGame;

        for (let turn = 0; turn < 4; turn++) {
            const { game: nextGame } = await runPassTurnOnGame(game);
            game = nextGame;

            if (game.isFinished) {
                assertIsFinished(assert, game, true);
                assertPlayerHealth(assert, game, "playerTwo", 0);
                return;
            }
        }

        assert.fail("Expected game to finish from fatigue damage");
    });
});
