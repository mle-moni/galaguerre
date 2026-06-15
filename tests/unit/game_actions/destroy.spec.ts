import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { applySilenceToMinion } from "#galaguerre/action_engine/apply_silence";
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionPowersSnapshot,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const destroyEnemyMinion = createCardActionSnapshot({
    type: "DESTROY",
    isTargeted: true,
    target: createMinionTargetSnapshot("OPPONENT"),
});

test.group("DESTROY action", () => {
    test("kills a 1-health minion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 1, health: 1 });
        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
                },
            }),
        );

        executeAction(destroyEnemyMinion, game, game.data.playerOne, game.data.playerTwo, {
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
    });

    test("kills a 15-health minion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 5, health: 15 });
        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(targetCard, { health: 15, maxHealth: 15 }),
                    ),
                },
            }),
        );

        executeAction(destroyEnemyMinion, game, game.data.playerOne, game.data.playerTwo, {
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
    });

    test("kills a minion with divine shield", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 3,
            health: 5,
            minionPowers: createMinionPowersSnapshot({ hasDivineShield: true }),
            effects: ["Immunité"],
        });
        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
                },
            }),
        );

        executeAction(destroyEnemyMinion, game, game.data.playerOne, game.data.playerTwo, {
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
    });

    test("does not trigger DAMAGE passives", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DAMAGE",
                    triggerTargetFilter: createMinionTargetSnapshot("PLAYER"),
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 5 });
        const targetCard = createMinionCard({ uuid: "target", attack: 1, health: 10 });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
                        "SPOT_2",
                        createMinionState(allyMinion),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(targetCard, { health: 10, maxHealth: 10 }),
                    ),
                },
            }),
        );

        executeAction(destroyEnemyMinion, game, game.data.playerOne, game.data.playerTwo, {
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 5 });
    });

    test("triggers deathrattle of destroyed minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 1,
            health: 10,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(targetCard, { health: 10, maxHealth: 10 }),
                    ),
                },
            }),
        );

        executeAction(destroyEnemyMinion, game, game.data.playerOne, game.data.playerTwo, {
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 3);
    });

    test("does not trigger deathrattle when minion is silenced", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 1,
            health: 10,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const target = createMinionState(targetCard, { health: 10, maxHealth: 10 });
        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");

        executeAction(destroyEnemyMinion, game, game.data.playerOne, game.data.playerTwo, {
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH);
    });

    test("mass destroy kills all matching enemy minions", ({ assert }) => {
        const victimOne = createMinionCard({ uuid: "victim-1", attack: 1, health: 5 });
        const victimTwo = createMinionCard({ uuid: "victim-2", attack: 2, health: 10 });
        const ally = createMinionCard({ uuid: "ally", attack: 3, health: 4 });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(ally)),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(victimOne)),
                        "SPOT_2",
                        createMinionState(victimTwo, { health: 10, maxHealth: 10 }),
                    ),
                },
            }),
        );

        executeAction(
            createCardActionSnapshot({
                type: "DESTROY",
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", null);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 4 });
    });

    test("chained mass destroy deathrattles do not recurse infinitely", ({ assert }) => {
        const massDestroyDeathrattle = [
            createCardActionSnapshot({
                type: "DESTROY",
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
        ];
        const dyingCard = createMinionCard({
            uuid: "dying",
            attack: 1,
            health: 1,
            deathrattleActions: massDestroyDeathrattle,
        });
        const mirrorCard = createMinionCard({
            uuid: "mirror-deathrattle",
            attack: 1,
            health: 1,
            deathrattleActions: massDestroyDeathrattle,
        });
        const survivorCard = createMinionCard({
            uuid: "survivor",
            attack: 3,
            health: 5,
        });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(survivorCard)),
                        "SPOT_2",
                        createMinionState(mirrorCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(dyingCard)),
                },
            }),
        );

        executeAction(destroyEnemyMinion, game, game.data.playerOne, game.data.playerTwo, {
            spotId: "SPOT_1",
            owner: "OPPONENT",
        });

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", null);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", null);
    });
});
