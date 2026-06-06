import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import Action from "#models/action";
import {
    assertBoardSpot,
    assertIsFinished,
    assertPlayerHealth,
} from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
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
import { validateDeathrattleAction } from "../../../app/galaguerre/validation/validate_deathrattle_action.js";

const nullActionFields = {
    drawCount: null,
    drawCardFilterId: null,
    enemyDrawCount: null,
    enemyDrawCardFilterId: null,
    damage: null,
    heal: null,
    boostId: null,
};

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
        assertPlayerHealth(assert, result.game, "playerOne", 15);
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
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
        assertPlayerHealth(assert, result.game, "playerOne", 13);
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
        assertPlayerHealth(assert, result.game, "playerOne", 12);
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
                    damage: 15,
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
        const action = await Action.create({
            internalLabel: "Invalid targeted deathrattle",
            type: "DAMAGE",
            isTargeted: true,
            ...nullActionFields,
            damage: 2,
        });

        const error = validateDeathrattleAction(action);

        assert.isNotNull(error);
        assert.include(error!.reason, "cannot be targeted");
    });
});
