import { test } from "@japa/runner";
import {
    parseMinionData,
    parseSpellData,
    safeParseCardData,
} from "#galaguerre/card_definition.schema";
import {
    boostAction,
    boostSpellPower,
    damageAction,
    defaultMinionData,
    defineMinion,
    drawAction,
    enemyHero,
    enemyMinions,
} from "../../database/seed_data/cards/define_card.js";

test.group("card_definition.schema", () => {
    test("accepts valid minion with battlecry", ({ assert }) => {
        const data = parseMinionData(
            defineMinion(
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

        const result = safeParseCardData("MINION", data);
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

        const result = safeParseCardData("MINION", data);
        assert.isFalse(result.success);
    });

    test("rejects DRAW with invalid drawCount", ({ assert }) => {
        const data = {
            schemaVersion: 1 as const,
            tags: [],
            action: drawAction(0),
        };

        const result = safeParseCardData("SPELL", data);
        assert.isFalse(result.success);
    });

    test("rejects BOOST spellPower targeting MINION", ({ assert }) => {
        const data = {
            ...defaultMinionData(),
            battlecryActions: [boostAction(boostSpellPower(1), enemyMinions())],
        };

        const result = safeParseCardData("MINION", data);
        assert.isFalse(result.success);
    });

    test("accepts valid spell", ({ assert }) => {
        const data = parseSpellData({
            schemaVersion: 1,
            tags: [],
            action: damageAction(4, enemyHero()),
        });

        assert.equal(data.action.damage, 4);
    });
});
