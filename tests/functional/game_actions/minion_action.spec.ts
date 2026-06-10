import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
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
import { runInvalidMinionActionPayload } from "#tests/helpers/game/run_socket_event";
import {
    assertBothPlayersUpdated,
    assertError,
    assertOpponentHandHidden,
} from "#tests/helpers/game/socket_event_collector";

test.group("game:minion_action", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

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

        const result = await runMinionAction({
            data: createGameData({
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
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", {
            health: 1,
            attacksThisRound: 1,
        });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", { health: 1 });
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

        const result = await runMinionAction({
            data: createGameData({
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
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", null);
    });

    test("poisonous minion deals normal damage to hero", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            isPoisonous: true,
            effects: ["Toxique"],
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH - 1);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", {
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

        const result = await runMinionAction({
            data: createGameData({
                currentRound: 3,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 3 }),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("windfury allows two attacks in the same turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
            hasWindfury: true,
            effects: ["Furie des vents"],
        });

        const initial = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, initial, { error: null });
        assertPlayerHealth(assert, initial.game, "playerTwo", DEFAULT_HERO_HEALTH - 5);

        const second = await runMinionActionOnGame(initial.game, initial.actorUserId, {
            minionId: MINION_IDS.attacker,
            spotId: null,
            owner: "OPPONENT",
        });

        assertMinionActionScenario(assert, second, { error: null });
        assertPlayerHealth(assert, second.game, "playerTwo", DEFAULT_HERO_HEALTH - 10);
        assertBoardSpot(assert, second.game, "playerOne", "SPOT_1", { attacksThisRound: 2 });
    });

    test("windfury rejects a third attack in the same turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 10,
            hasWindfury: true,
            effects: ["Furie des vents"],
        });

        const initial = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        const second = await runMinionActionOnGame(initial.game, initial.actorUserId, {
            minionId: MINION_IDS.attacker,
            spotId: null,
            owner: "OPPONENT",
        });

        const third = await runMinionActionOnGame(second.game, initial.actorUserId, {
            minionId: MINION_IDS.attacker,
            spotId: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Ce serviteur a déjà attaqué ce tour");
        assertPlayerHealth(assert, third.game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
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

        const initial = await runMinionAction({
            data: createGameData({
                currentRound: 2,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 2 }),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, initial, { error: null });
        assertPlayerHealth(assert, initial.game, "playerTwo", DEFAULT_HERO_HEALTH - 2);

        const second = await runMinionActionOnGame(initial.game, initial.actorUserId, {
            minionId: MINION_IDS.attacker,
            spotId: null,
            owner: "OPPONENT",
        });

        assertMinionActionScenario(assert, second, { error: null });
        assertPlayerHealth(assert, second.game, "playerTwo", DEFAULT_HERO_HEALTH - 4);
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

        const result = await runMinionAction({
            data: createGameData({
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
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", {
            health: 1,
            attacksThisRound: 1,
        });
    });

    test("rejects action when it is not the player turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const result = await runMinionAction({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerTwo",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Ce n'est pas votre tour (gros con)",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Ce n'est pas votre tour (gros con)",
        });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects attack when minion was placed this turn without charge", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const result = await runMinionAction({
            data: createGameData({
                currentRound: 2,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 2 }),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Ce serviteur n'est pas encore prêt à attaquer",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Ce serviteur n'est pas encore prêt à attaquer",
        });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects attack when minion has zero attack", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 0,
            health: 4,
            hasTaunt: true,
            effects: ["Provocation"],
        });

        const result = await runMinionAction({
            data: createGameData({
                currentRound: 3,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, { placedAtRound: 1 }),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Ce serviteur ne peut pas attaquer sans points d'attaque",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Ce serviteur ne peut pas attaquer sans points d'attaque",
        });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects attack when taunt minion is ignored", async ({ assert }) => {
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

        const result = await runMinionAction({
            data: createGameData({
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
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: {
                error: "Vous devez d'abord attaquer un serviteur avec Provocation",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Vous devez d'abord attaquer un serviteur avec Provocation",
        });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", { health: 4 });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 3 });
    });

    test("rejects attack on own minion", async ({ assert }) => {
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
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: {
                error: "J'aurai pu te laisser attaquer ton propre serviteur mais j'ai décidé d'être clément...",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "J'aurai pu te laisser attaquer ton propre serviteur mais j'ai décidé d'être clément...",
        });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 1 });
    });

    test("rejects action when minion is not on the board", async ({ assert }) => {
        const result = await runMinionAction({
            data: createGameData(),
            actor: "playerOne",
            action: {
                minionId: "nonexistent-minion",
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Ce serviteur n'est pas sur le plateau (gros con)",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Ce serviteur n'est pas sur le plateau (gros con)",
        });
    });

    test("rejects attack on an empty opponent spot", async ({ assert }) => {
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
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_2",
                owner: "OPPONENT",
            },
            expect: {
                error: "Vous ne pouvez pas jouer ce serviteur ici",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Vous ne pouvez pas jouer ce serviteur ici",
        });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 1 });
    });

    test("lethal hero attack terminates the game", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: DEFAULT_HERO_HEALTH,
            health: 1,
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null, isFinished: true },
        });

        assertMinionActionScenario(assert, result, { error: null, isFinished: true });
        assertPlayerHealth(assert, result.game, "playerTwo", 0);
        assertBothPlayersUpdated(assert);
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

        const result = await runMinionAction({
            data: createGameData({
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
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Vous devez d'abord attaquer un serviteur avec Provocation",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Vous devez d'abord attaquer un serviteur avec Provocation",
        });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
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

        const result = await runMinionAction({
            data: createGameData({
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
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_2",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 2 });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", { health: 4 });
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

        const result = await runMinionAction({
            data: createGameData({
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
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", { health: 3 });
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

        const result = await runMinionAction({
            data: createGameData({
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
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
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

        const result = await runMinionAction({
            data: createGameData({
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
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
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

        const result = await runMinionAction({
            data: createGameData({
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
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
    });

    test("rejects a second attack without windfury", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 10,
        });

        const initial = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        const second = await runMinionActionOnGame(initial.game, initial.actorUserId, {
            minionId: MINION_IDS.attacker,
            spotId: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Ce serviteur a déjà attaqué ce tour");
        assertPlayerHealth(assert, second.game, "playerTwo", DEFAULT_HERO_HEALTH - 1);
    });

    test("increments attacksThisRound and lastActionAtRound after a successful attack", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
        });

        const result = await runMinionAction({
            data: createGameData({
                currentRound: 5,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        const minion = result.game.data.playerOne.board.SPOT_1;
        assert.isNotNull(minion);
        assert.equal(minion!.attacksThisRound, 1);
        assert.equal(minion!.lastActionAtRound, 5);
    });

    test("non-lethal hero attack damages opponent and leaves the board unchanged", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 3,
        });
        const opponentMinion = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const result = await runMinionAction({
            data: createGameData({
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
                        createMinionState(opponentMinion),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH - 5);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 3 });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 4 });
    });

    test("rejects action when user has no active game", async ({ assert }) => {
        const result = await runMinionAction({
            data: createGameData(),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
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
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
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
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: "Vous n'êtes pas en jeu" },
            isFinished: true,
        });

        assertMinionActionScenario(assert, result, { error: "Vous n'êtes pas en jeu" });
    });

    test("rejects action with opponent minion id on opponent board", async ({ assert }) => {
        const opponentMinion = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 2,
        });

        const result = await runMinionAction({
            data: createGameData({
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(opponentMinion),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.target,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: {
                error: "Ce serviteur n'est pas sur le plateau (gros con)",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "Ce serviteur n'est pas sur le plateau (gros con)",
        });
    });

    test("rejects attacking own hero with owner PLAYER", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: null,
                owner: "PLAYER",
            },
            expect: {
                error: "J'aurai pu te laisser attaquer ton propre héros mais j'ai décidé d'être clément...",
            },
        });

        assertMinionActionScenario(assert, result, {
            error: "J'aurai pu te laisser attaquer ton propre héros mais j'ai décidé d'être clément...",
        });
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH);
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects invalid minion action payload", async ({ assert }) => {
        const errors = await runInvalidMinionActionPayload({
            minionId: "minion-1",
            spotId: "INVALID_SPOT",
            owner: "OPPONENT",
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
                        "SPOT_1",
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
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertBothPlayersUpdated(assert);
        assertOpponentHandHidden(assert, result.actorUserId, result.game.data.playerTwo.userId, 1);
    });
});
