import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { safeParseCardData } from "#galaguerre/card_definition.schema";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import {
    assertBoardSpot,
    assertIsFinished,
    assertPlayerHealth,
} from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createAllTargetSnapshot,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertMinionActionScenario, runMinionAction } from "#tests/helpers/game/run_minion_action";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";
import { defaultMinionData, enemyHero } from "#database/seed_data/cards/define_card";

test.group("game:deathrattle", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("minion without deathrattle dies in combat as before", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
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
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH);
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("DAMAGE deathrattle deals damage to opponent hero on combat death", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
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
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH - 2);
    });

    test("deathrattle triggers when minion is killed by battlecry damage", async ({ assert }) => {
        const killerCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const victimCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [killerCard] },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(victimCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { owner: "OPPONENT", spotId: "SPOT_1" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH - 3);
    });

    test("chained mass DAMAGE deathrattles do not recurse infinitely", async ({ assert }) => {
        const massDamageDeathrattle = [
            createCardActionSnapshot({
                type: "DAMAGE",
                damage: 1,
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
        ];
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const dyingCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            deathrattleActions: massDamageDeathrattle,
        });
        const mirrorCard = createMinionCard({
            uuid: "mirror-deathrattle",
            attack: 1,
            health: 1,
            deathrattleActions: massDamageDeathrattle,
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: {
                        ...createGameData().playerOne.board,
                        SPOT_1: createMinionState(attackerCard),
                        SPOT_2: createMinionState(mirrorCard),
                    },
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(dyingCard),
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
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 1 });
    });

    test("mass DAMAGE deathrattle kills all matching enemy minions", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const dyingCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 1,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const victimOne = createMinionCard({ uuid: "victim-1", attack: 1, health: 1 });
        const victimTwo = createMinionCard({ uuid: "victim-2", attack: 1, health: 1 });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: {
                        ...createGameData().playerOne.board,
                        SPOT_1: createMinionState(attackerCard),
                        SPOT_2: createMinionState(victimOne),
                        SPOT_3: createMinionState(victimTwo),
                    },
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(dyingCard),
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
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_3", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 1 });
    });

    test("mass DAMAGE deathrattle damages minions on both teams", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const dyingCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 1,
                    target: createMinionTargetSnapshot("ALL"),
                }),
            ],
        });
        const allyVictim = createMinionCard({ uuid: "ally-victim", attack: 1, health: 1 });
        const enemyVictim = createMinionCard({ uuid: "enemy-victim", attack: 1, health: 1 });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: {
                        ...placeMinion(
                            createGameData().playerOne.board,
                            "SPOT_1",
                            createMinionState(attackerCard),
                        ),
                        SPOT_2: createMinionState(allyVictim),
                    },
                },
                playerTwo: {
                    board: {
                        ...placeMinion(
                            createGameData().playerTwo.board,
                            "SPOT_1",
                            createMinionState(dyingCard),
                        ),
                        SPOT_2: createMinionState(enemyVictim),
                    },
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
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", null);
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 1 });
    });

    test("ALL DAMAGE deathrattle (Abomination) damages all characters", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
        });
        const abominationCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 4,
            health: 4,
            hasTaunt: true,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createAllTargetSnapshot("ALL"),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", attack: 1, health: 3 });
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", attack: 1, health: 3 });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: {
                        ...placeMinion(
                            createGameData().playerOne.board,
                            "SPOT_1",
                            createMinionState(attackerCard),
                        ),
                        SPOT_2: createMinionState(allyMinion),
                    },
                },
                playerTwo: {
                    board: {
                        ...placeMinion(
                            createGameData().playerTwo.board,
                            "SPOT_1",
                            createMinionState(abominationCard),
                        ),
                        SPOT_2: createMinionState(enemyMinion),
                    },
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
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH - 2);
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { health: 1 });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("ALL DAMAGE deathrattle (Abomination) does not modify player hand", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
        });
        const abominationCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 4,
            health: 4,
            hasTaunt: true,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createAllTargetSnapshot("ALL"),
                }),
            ],
        });
        const handCards = [
            createMinionCard({ uuid: "hand-card-1", label: "Main 1", cost: 2 }),
            createMinionCard({ uuid: "hand-card-2", label: "Main 2", cost: 3 }),
            createMinionCard({ uuid: "hand-card-3", label: "Main 3", cost: 4 }),
        ];
        const boardMinion = createMinionCard({ uuid: "board-minion", attack: 1, health: 3 });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    hand: handCards,
                    board: {
                        ...placeMinion(
                            createGameData().playerOne.board,
                            "SPOT_1",
                            createMinionState(attackerCard),
                        ),
                        SPOT_2: createMinionState(boardMinion),
                    },
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(abominationCard),
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
        assert.equal(result.game.data.playerOne.hand.length, 3);
        assert.deepEqual(
            result.game.data.playerOne.hand.map((card) => card.uuid),
            ["hand-card-1", "hand-card-2", "hand-card-3"],
        );
        assert.deepEqual(
            result.game.data.playerOne.hand.map((card) => card.label),
            ["Main 1", "Main 2", "Main 3"],
        );
    });

    test("HERO DAMAGE deathrattle with ALL damages both heroes", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
        });
        const dyingCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    target: createHeroTargetSnapshot("ALL"),
                }),
            ],
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
                        createMinionState(dyingCard),
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
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH - 3);
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
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
            expect: { error: null, isFinished: true },
        });

        assertMinionActionScenario(assert, result, { error: null, isFinished: true });
        assertIsFinished(assert, result.game, true);
        assertPlayerHealth(assert, result.game, "playerOne", 0);
    });

    test("targeted deathrattle action is rejected by validation", async ({ assert }) => {
        const result = safeParseCardData("MINION", {
            ...defaultMinionData(),
            deathrattleActions: [
                {
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 2,
                    heal: null,
                    drawCount: null,
                    enemyDrawCount: null,
                    drawCardFilter: null,
                    enemyDrawCardFilter: null,
                    boost: null,
                    target: enemyHero(),
                },
            ],
        });

        assert.isFalse(result.success);
    });
});
