import { test } from "@japa/runner";
import {
    parseMinionData,
    parseSpellData,
    safeParseCardData,
} from "#galaguerre/card_definition.schema";
import {
    boostAction,
    boostBoth,
    damageAction,
    defaultMinionData,
    defaultSpellData,
    defineMinion,
    drawAction,
    enemyHero,
    enemyMinions,
    allMinions,
    selfMinion,
    silenceAction,
    manaTemporaryChangeAction,
    manaTemporaryChangePerOpponentMinionAction,
    reconversionAction,
    reconversionToCardId,
    reconvertParameters,
    dynamicCostPerBoardMinion,
    dynamicCostPerHandCard,
    dynamicCostPerHeroMissingHealth,
    actionPassive,
    allyMinions,
    spellDrawFilter,
    targetedEnemyMinion,
} from "../../database/seed_data/cards/define_card.js";

test.group("card_definition.schema", () => {
    test("accepts valid minion with battlecry", ({ assert }) => {
        const data = parseMinionData(
            defineMinion(
                1,
                {
                    label: "Test",
                    cost: 1,
                    imageUrl: "https://example.com/card.png",
                    cardSetName: "Hearthstone",
                    attack: 2,
                    health: 2,
                },
                {
                    battlecryActions: [damageAction(2, enemyHero())],
                },
            ).data,
        );

        assert.equal(data.battlecryActions.length, 1);
        const battlecry = data.battlecryActions[0]!;
        assert.equal(battlecry.type, "DAMAGE");
        if (battlecry.type === "DAMAGE") {
            assert.equal(battlecry.damage, 2);
        }
    });

    test("accepts dynamicCost reductions on minion data", ({ assert }) => {
        const data = parseMinionData({
            ...defaultMinionData(),
            cost: 10,
            dynamicCost: {
                reductions: [
                    { source: "HAND_CARD_COUNT", amountPer: 1 },
                    { source: "BOARD_MINION_COUNT", amountPer: 1 },
                    { source: "HERO_MISSING_HEALTH", amountPer: 1 },
                ],
            },
        });

        assert.equal(data.dynamicCost?.reductions.length, 3);
        assert.equal(data.dynamicCost?.reductions[0]!.source, "HAND_CARD_COUNT");
    });

    test("accepts dynamicCost helper definitions", ({ assert }) => {
        assert.deepEqual(dynamicCostPerHandCard(), {
            reductions: [{ source: "HAND_CARD_COUNT", amountPer: 1 }],
        });
        assert.deepEqual(dynamicCostPerBoardMinion(2), {
            reductions: [{ source: "BOARD_MINION_COUNT", amountPer: 2 }],
        });
        assert.deepEqual(dynamicCostPerHeroMissingHealth(), {
            reductions: [{ source: "HERO_MISSING_HEALTH", amountPer: 1 }],
        });
    });

    test("rejects targeted deathrattle action", ({ assert }) => {
        const data = {
            ...defaultMinionData(),
            deathrattleActions: [damageAction(1, enemyHero(), true)],
        };

        const result = safeParseCardData(data);
        assert.isFalse(result.success);
    });

    test("rejects DAMAGE without target", ({ assert }) => {
        const data = {
            ...defaultMinionData(),
            battlecryActions: [{ ...damageAction(2, enemyHero()), target: null }],
        };

        const result = safeParseCardData(data);
        assert.isFalse(result.success);
    });

    test("rejects DRAW with invalid drawCount", ({ assert }) => {
        const data = {
            ...defaultSpellData(),
            spellActions: [drawAction(0)],
        };

        const result = safeParseCardData(data);
        assert.isFalse(result.success);
    });

    test("rejects BOOST spellPower targeting MINION", ({ assert }) => {
        const data = {
            ...defaultMinionData(),
            battlecryActions: [
                boostAction(
                    {
                        attack: 1,
                        health: null,
                        spellPower: 1,
                        extraBattlecryTriggers: null,
                        minionPowers: null,
                    },
                    enemyMinions(),
                ),
            ],
        };

        const result = safeParseCardData(data);
        assert.isFalse(result.success);
    });

    test("rejects mismatched type discriminator", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultMinionData(),
            type: "SPELL",
        });

        assert.isFalse(result.success);
    });

    test("accepts valid spell", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [damageAction(4, enemyHero())],
        });

        assert.equal(data.spellActions[0]!.type, "DAMAGE");
        if (data.spellActions[0]!.type === "DAMAGE") {
            assert.equal(data.spellActions[0]!.damage, 4);
        }
    });

    test("accepts spell with multiple actions", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [
                silenceAction(targetedEnemyMinion(), true),
                damageAction(1, targetedEnemyMinion(), true),
            ],
        });

        assert.equal(data.spellActions.length, 2);
        assert.equal(data.spellActions[0]!.type, "SILENCE");
        assert.equal(data.spellActions[1]!.type, "DAMAGE");
    });

    test("rejects spell with empty spellActions", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [],
        });

        assert.isFalse(result.success);
    });

    test("accepts valid SILENCE action targeting minion", ({ assert }) => {
        const data = parseMinionData({
            ...defaultMinionData(),
            battlecryActions: [silenceAction(targetedEnemyMinion(), true)],
        });

        assert.equal(data.battlecryActions[0]!.type, "SILENCE");
        assert.isTrue(data.battlecryActions[0]!.isTargeted);
    });

    test("rejects SILENCE targeting HERO", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [silenceAction(enemyHero())],
        });

        assert.isFalse(result.success);
    });

    test("strips unknown fields from SILENCE action", ({ assert }) => {
        const data = parseMinionData({
            ...defaultMinionData(),
            battlecryActions: [
                {
                    ...silenceAction(enemyMinions()),
                    boost: { attack: 1, health: null, spellPower: null, minionPowers: null },
                },
            ],
        });

        assert.equal(data.battlecryActions[0]!.type, "SILENCE");
        assert.notProperty(data.battlecryActions[0], "boost");
    });

    test("accepts valid RECONVERSION action targeting minion", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [reconversionToCardId(121, targetedEnemyMinion(), true)],
        });

        assert.equal(data.spellActions[0]!.type, "RECONVERSION");
        if (data.spellActions[0]!.type === "RECONVERSION") {
            assert.equal(data.spellActions[0]!.reconvertParameters.cardId, 121);
            assert.isTrue(data.spellActions[0]!.isTargeted);
        }
    });

    test("accepts RECONVERSION with filter parameters and no cardId", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [
                reconversionAction(
                    reconvertParameters({
                        comparison: {
                            costComparison: "=",
                            cost: 3,
                            attackComparison: null,
                            attack: null,
                            healthComparison: null,
                            health: null,
                        },
                    }),
                    enemyMinions(),
                ),
            ],
        });

        assert.equal(data.spellActions[0]!.type, "RECONVERSION");
        if (data.spellActions[0]!.type === "RECONVERSION") {
            assert.isNull(data.spellActions[0]!.reconvertParameters.cardId);
            assert.equal(data.spellActions[0]!.reconvertParameters.comparison?.cost, 3);
        }
    });

    test("rejects RECONVERSION without reconvertParameters", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [
                {
                    ...reconversionToCardId(121, targetedEnemyMinion(), true),
                    reconvertParameters: null,
                },
            ],
        });

        assert.isFalse(result.success);
    });

    test("rejects RECONVERSION targeting HERO", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [reconversionToCardId(121, enemyHero())],
        });

        assert.isFalse(result.success);
    });

    test("strips unknown fields from RECONVERSION action", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [
                {
                    ...reconversionToCardId(121, targetedEnemyMinion(), true),
                    damage: 1,
                },
            ],
        });

        assert.equal(data.spellActions[0]!.type, "RECONVERSION");
        assert.notProperty(data.spellActions[0], "damage");
    });

    test("rejects target with onlySelf and excludeSelf together", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultMinionData(),
            battlecryActions: [
                damageAction(1, {
                    type: "MINION",
                    targetTeam: "PLAYER",
                    comparison: null,
                    tag: null,
                    excludeSelf: true,
                    onlySelf: true,
                    maxTargets: null,
                    targetSelectionMode: null,
                    adjacency: null,
                }),
            ],
        });

        assert.isFalse(result.success);
    });

    test("accepts onlySelf target on passive action", ({ assert }) => {
        const data = parseMinionData({
            ...defaultMinionData(),
            passives: [actionPassive("TURN_END", boostAction(boostBoth(1, 1), selfMinion()))],
        });

        const passiveAction = data.passives[0]!.action;
        assert.isDefined(passiveAction);
        if (passiveAction?.type === "BOOST") {
            assert.equal(passiveAction.target?.onlySelf, true);
        }
    });

    test("accepts PLAY_CARD passive with playCardFilter", ({ assert }) => {
        const data = parseMinionData({
            ...defaultMinionData(),
            passives: [
                actionPassive("PLAY_CARD", damageAction(1, allMinions()), spellDrawFilter()),
            ],
        });

        assert.equal(data.passives[0]!.triggersOn, "PLAY_CARD");
        assert.equal(data.passives[0]!.playCardFilter?.type, "SPELL");
    });

    test("rejects playCardFilter on TURN_END passive", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultMinionData(),
            passives: [
                {
                    ...actionPassive("TURN_END", damageAction(1, enemyHero())),
                    playCardFilter: spellDrawFilter(),
                },
            ],
        });

        assert.isFalse(result.success);
    });

    test("accepts DAMAGE passive with triggerTargetFilter", ({ assert }) => {
        const data = parseMinionData({
            ...defaultMinionData(),
            passives: [actionPassive("DAMAGE", damageAction(1, enemyHero()), null, allyMinions())],
        });

        assert.equal(data.passives[0]!.triggersOn, "DAMAGE");
        assert.equal(data.passives[0]!.triggerTargetFilter?.targetTeam, "PLAYER");
    });

    test("rejects triggerTargetFilter on TURN_END passive", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultMinionData(),
            passives: [
                {
                    ...actionPassive("TURN_END", damageAction(1, enemyHero())),
                    triggerTargetFilter: allyMinions(),
                },
            ],
        });

        assert.isFalse(result.success);
    });

    test("rejects maxTargets on triggerTargetFilter", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultMinionData(),
            passives: [
                {
                    ...actionPassive("HEAL", damageAction(1, enemyHero()), null, allyMinions()),
                    triggerTargetFilter: {
                        ...allyMinions(),
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM" as const,
                    },
                },
            ],
        });

        assert.isFalse(result.success);
    });

    test("accepts targeted damage with onTargetResult", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [
                damageAction(2, targetedEnemyMinion(), true, {
                    onTargetResult: {
                        when: "SURVIVED",
                        healthComparison: {
                            costComparison: null,
                            cost: null,
                            attackComparison: null,
                            attack: null,
                            healthComparison: "=",
                            health: 1,
                        },
                        action: drawAction(2),
                    },
                }),
            ],
        });

        assert.isNotNull(data.spellActions[0]!.onTargetResult);
        assert.equal(data.spellActions[0]!.onTargetResult!.when, "SURVIVED");
    });

    test("rejects onTargetResult on non-targeted damage", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [
                {
                    ...damageAction(2, enemyMinions()),
                    onTargetResult: {
                        when: "KILLED",
                        healthComparison: null,
                        action: drawAction(1),
                    },
                },
            ],
        });

        assert.isFalse(result.success);
    });

    test("rejects KILLED onTargetResult with healthComparison", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [
                damageAction(2, targetedEnemyMinion(), true, {
                    onTargetResult: {
                        when: "KILLED",
                        healthComparison: {
                            costComparison: null,
                            cost: null,
                            attackComparison: null,
                            attack: null,
                            healthComparison: "=",
                            health: 1,
                        },
                        action: drawAction(1),
                    },
                }),
            ],
        });

        assert.isFalse(result.success);
    });

    test("accepts spell with MANA TEMPORARY_CHANGE action", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [manaTemporaryChangeAction(2)],
        });

        assert.equal(data.spellActions[0]!.type, "MANA");
        if (data.spellActions[0]!.type === "MANA") {
            assert.equal(data.spellActions[0]!.subtype, "TEMPORARY_CHANGE");
            assert.equal(data.spellActions[0]!.amount, 2);
            assert.isNull(data.spellActions[0]!.amountScale);
        }
    });

    test("accepts spell with scaled MANA TEMPORARY_CHANGE action", ({ assert }) => {
        const data = parseSpellData({
            ...defaultSpellData(),
            spellActions: [manaTemporaryChangePerOpponentMinionAction(1)],
        });

        assert.equal(data.spellActions[0]!.type, "MANA");
        if (data.spellActions[0]!.type === "MANA") {
            assert.deepEqual(data.spellActions[0]!.amountScale, {
                source: "OPPONENT_MINION_COUNT",
                amountPer: 1,
            });
        }
    });

    test("rejects MANA action with amount <= 0", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [
                {
                    type: "MANA",
                    isTargeted: false,
                    subtype: "TEMPORARY_CHANGE",
                    amount: 0,
                    amountScale: null,
                    actionCondition: null,
                    onTargetResult: null,
                },
            ],
        });

        assert.isFalse(result.success);
    });

    test("rejects MANA action with amountScale amountPer <= 0", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultSpellData(),
            spellActions: [
                {
                    type: "MANA",
                    isTargeted: false,
                    subtype: "TEMPORARY_CHANGE",
                    amount: 1,
                    amountScale: { source: "OPPONENT_MINION_COUNT", amountPer: 0 },
                    actionCondition: null,
                    onTargetResult: null,
                },
            ],
        });

        assert.isFalse(result.success);
    });
});
