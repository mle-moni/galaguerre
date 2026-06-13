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
    actionPassive,
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
        assert.equal(data.battlecryActions[0]!.damage, 2);
    });

    test("rejects targeted deathrattle action", ({ assert }) => {
        const data = {
            ...defaultMinionData(),
            deathrattleActions: [
                {
                    type: "DAMAGE" as const,
                    isTargeted: true,
                    damage: 1,
                    heal: null,
                    drawCount: null,
                    enemyDrawCount: null,
                    drawCardFilter: null,
                    enemyDrawCardFilter: null,
                    boost: null,
                    target: enemyHero(),
                },
            ],
        };

        const result = safeParseCardData(data);
        assert.isFalse(result.success);
    });

    test("rejects DAMAGE without target", ({ assert }) => {
        const data = {
            ...defaultMinionData(),
            battlecryActions: [
                {
                    type: "DAMAGE" as const,
                    isTargeted: false,
                    damage: 2,
                    heal: null,
                    drawCount: null,
                    enemyDrawCount: null,
                    drawCardFilter: null,
                    enemyDrawCardFilter: null,
                    boost: null,
                    target: null,
                },
            ],
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
                    { attack: 1, health: null, spellPower: 1, minionPowers: null },
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

        assert.equal(data.spellActions[0]!.damage, 4);
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

    test("rejects SILENCE with boost payload", ({ assert }) => {
        const result = safeParseCardData({
            ...defaultMinionData(),
            battlecryActions: [
                {
                    ...silenceAction(enemyMinions()),
                    boost: { attack: 1, health: null, spellPower: null, minionPowers: null },
                },
            ],
        });

        assert.isFalse(result.success);
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

        assert.equal(data.passives[0]!.action?.target?.onlySelf, true);
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
});
