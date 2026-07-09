import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { assertBoardIndex, assertPlayerHealth } from "#tests/helpers/game/assertions";
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
import { runBattlecry } from "#tests/helpers/game/run_battlecry";
import { runMinionCombat } from "#tests/helpers/game/run_minion_combat";

test.group("deathrattles", () => {
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

        const { game } = await runMinionCombat(
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

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
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

        const { game } = await runMinionCombat(
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

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 2);
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [killerCard] },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(victimCard),
                    ),
                },
            }),
            killerCard,
            { actionTarget: { owner: "OPPONENT", minionUuid: MINION_IDS.target } },
        );

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 3);
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

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: [createMinionState(attackerCard), createMinionState(mirrorCard)],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(dyingCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertBoardIndex(assert, game, "playerOne", 1, null);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 1 });
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

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: [
                        createMinionState(attackerCard),
                        createMinionState(victimOne),
                        createMinionState(victimTwo),
                    ],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(dyingCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertBoardIndex(assert, game, "playerOne", 1, null);
        assertBoardIndex(assert, game, "playerOne", 2, null);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 1 });
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

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerOne.board,
                            0,
                            createMinionState(attackerCard),
                        ),
                        1,
                        createMinionState(allyVictim),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerTwo.board,
                            0,
                            createMinionState(dyingCard),
                        ),
                        1,
                        createMinionState(enemyVictim),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertBoardIndex(assert, game, "playerOne", 1, null);
        assertBoardIndex(assert, game, "playerTwo", 1, null);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 1 });
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
            minionPowers: { hasTaunt: true },
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

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerOne.board,
                            0,
                            createMinionState(attackerCard),
                        ),
                        1,
                        createMinionState(allyMinion),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerTwo.board,
                            0,
                            createMinionState(abominationCard),
                        ),
                        1,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 1 });
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 2);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 1 });
        assertBoardIndex(assert, game, "playerOne", 1, null);
        assertBoardIndex(assert, game, "playerTwo", 1, null);
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
            minionPowers: { hasTaunt: true },
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

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    hand: handCards,
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerOne.board,
                            0,
                            createMinionState(attackerCard),
                        ),
                        1,
                        createMinionState(boardMinion),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(abominationCard),
                    ),
                },
            }),
        );

        assert.equal(game.data.playerOne.hand.length, 3);
        assert.deepEqual(
            game.data.playerOne.hand.map((card) => card.uuid),
            ["hand-card-1", "hand-card-2", "hand-card-3"],
        );
        assert.deepEqual(
            game.data.playerOne.hand.map((card) => card.label),
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

        const { game } = await runMinionCombat(
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
                        createMinionState(dyingCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 3);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
    });
});
