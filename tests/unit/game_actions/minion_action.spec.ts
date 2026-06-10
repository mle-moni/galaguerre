import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { assertBoardSpot, assertIsFinished, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runMinionCombat, runMinionCombatOnGame } from "#tests/helpers/game/run_minion_combat";

test.group("minion combat", () => {
    test("normal minion vs minion combat subtracts health from both", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }));

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
            health: 1,
            attacksThisRound: 1,
        });
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 1 });
    });


    test("poisonous minion kills high health target", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            isPoisonous: true,
            effects: ["Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 9,
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }));

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", null);
    });


    test("poisonous minion deals normal damage to hero", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            isPoisonous: true,
            effects: ["Toxique"],
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }), { heroAttack: true });

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 1);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
            health: 1,
            attacksThisRound: 1,
        });
    });


    test("charge allows attack on the turn the minion was placed", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
            hasCharge: true,
            effects: ["Charge"],
        });

        const { game } = await runMinionCombat(createGameData({
                currentRound: 3,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 3 }),
                    ),
                },
            }), { heroAttack: true });

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });


    test("windfury allows two attacks in the same turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
            hasWindfury: true,
            effects: ["Furie des vents"],
        });

        const { game: initialGame } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }), { heroAttack: true });

        assertPlayerHealth(assert, initialGame, "playerTwo", DEFAULT_HERO_HEALTH - 5);

        const { game: secondGame } = await runMinionCombatOnGame(initialGame, { heroAttack: true });

        assertPlayerHealth(assert, secondGame, "playerTwo", DEFAULT_HERO_HEALTH - 10);
        assertBoardSpot(assert, secondGame, "playerOne", "SPOT_1", { attacksThisRound: 2 });
    });


    test("charge and windfury allow two attacks on placement turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
            hasCharge: true,
            hasWindfury: true,
            effects: ["Charge", "Furie des vents"],
        });

        const { game: initialGame } = await runMinionCombat(createGameData({
                currentRound: 2,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 2 }),
                    ),
                },
            }), { heroAttack: true });

        assertPlayerHealth(assert, initialGame, "playerTwo", DEFAULT_HERO_HEALTH - 2);

        const { game: secondGame } = await runMinionCombatOnGame(initialGame, { heroAttack: true });

        assertPlayerHealth(assert, secondGame, "playerTwo", DEFAULT_HERO_HEALTH - 4);
    });


    test("charge and poisonous kills target on placement turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            hasCharge: true,
            isPoisonous: true,
            effects: ["Charge", "Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 0,
            health: 9,
        });

        const { game } = await runMinionCombat(createGameData({
                currentRound: 4,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 4 }),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }));

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
            health: 1,
            attacksThisRound: 1,
        });
    });


    test("lethal hero attack terminates the game", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: DEFAULT_HERO_HEALTH,
            health: 1,
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }), { heroAttack: true });

        assertPlayerHealth(assert, game, "playerTwo", 0);
        assertIsFinished(assert, game, true);
    });


    test("taunt blocks hero attack", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
        });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            attack: 1,
            health: 3,
            hasTaunt: true,
            effects: ["Provocation"],
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_2",
                        createMinionState(tauntCard),
                    ),
                },
            }), { heroAttack: true });

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });


    test("allows attacking a taunt minion when taunt is present", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            attack: 1,
            health: 3,
            hasTaunt: true,
            effects: ["Provocation"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: {
                        ...placeMinion(
                            createGameData().playerTwo.board,
                            "SPOT_1",
                            createMinionState(targetCard),
                        ),
                        SPOT_2: createMinionState(tauntCard),
                    },
                },
            }), { targetSpot: "SPOT_2" });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", null);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 2 });
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 4 });
    });


    test("attacker dies from counter damage in minion combat", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 3,
            health: 4,
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }));

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 3 });
    });


    test("both minions die in a lethal trade", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 3,
            health: 3,
        });

        const { game } = await runMinionCombat(createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }));

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
    });

    test("poisonous attacker dies from counter damage but still kills the target", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            isPoisonous: true,
            effects: ["Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 5,
            health: 5,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
    });

    test("attacker dies from poisonous counter damage regardless of remaining health", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 10,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            isPoisonous: true,
            effects: ["Toxique"],
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
    });

    test("increments attacksThisRound and lastActionAtRound after a successful attack", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 3,
        });

        const { game } = await runMinionCombat(
            createGameData({
                currentRound: 2,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 1 }),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
            attacksThisRound: 1,
            lastActionAtRound: 2,
        });
    });

    test("non-lethal hero attack damages opponent and leaves the board unchanged", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const boardMinion = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 2,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_2",
                        createMinionState(boardMinion),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 3 });
        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 2 });
    });

});
