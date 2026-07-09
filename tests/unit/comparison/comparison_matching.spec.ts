import { test } from "@japa/runner";
import {
    compareValue,
    getBoardMinionStats,
    getDeckCardStats,
    matchesComparison,
} from "#api_types/comparison_matching";
import {
    createComparisonSnapshot,
    createMinionCard,
    createMinionState,
    createSpellCard,
} from "#tests/helpers/game/fixtures";

test.group("comparison_matching", () => {
    test("compareValue handles all operators", ({ assert }) => {
        assert.isTrue(compareValue(2, "<", 3));
        assert.isFalse(compareValue(3, "<", 3));
        assert.isTrue(compareValue(4, ">", 3));
        assert.isFalse(compareValue(3, ">", 3));
        assert.isTrue(compareValue(3, "=", 3));
        assert.isFalse(compareValue(2, "=", 3));
    });

    test("matchesComparison returns true when comparison is null", ({ assert }) => {
        assert.isTrue(matchesComparison({ cost: 1, attack: 1, health: 1 }, null));
    });

    test("matchesComparison filters on cost", ({ assert }) => {
        const stats = { cost: 3, attack: 1, health: 1 };

        assert.isTrue(
            matchesComparison(stats, createComparisonSnapshot({ costComparison: "=", cost: 3 })),
        );
        assert.isFalse(
            matchesComparison(stats, createComparisonSnapshot({ costComparison: ">", cost: 3 })),
        );
    });

    test("matchesComparison filters on attack", ({ assert }) => {
        const stats = { cost: 1, attack: 4, health: 1 };

        assert.isTrue(
            matchesComparison(
                stats,
                createComparisonSnapshot({ attackComparison: ">", attack: 2 }),
            ),
        );
        assert.isFalse(
            matchesComparison(
                stats,
                createComparisonSnapshot({ attackComparison: ">", attack: 4 }),
            ),
        );
    });

    test("matchesComparison filters on health", ({ assert }) => {
        const stats = { cost: 1, attack: 1, health: 2 };

        assert.isTrue(
            matchesComparison(
                stats,
                createComparisonSnapshot({ healthComparison: "<", health: 5 }),
            ),
        );
        assert.isFalse(
            matchesComparison(
                stats,
                createComparisonSnapshot({ healthComparison: "<", health: 2 }),
            ),
        );
    });

    test("matchesComparison combines criteria with AND logic", ({ assert }) => {
        const stats = { cost: 3, attack: 4, health: 2 };

        assert.isTrue(
            matchesComparison(
                stats,
                createComparisonSnapshot({
                    costComparison: "=",
                    cost: 3,
                    attackComparison: ">",
                    attack: 2,
                    healthComparison: "<",
                    health: 5,
                }),
            ),
        );
        assert.isFalse(
            matchesComparison(
                stats,
                createComparisonSnapshot({
                    costComparison: "=",
                    cost: 3,
                    attackComparison: ">",
                    attack: 4,
                }),
            ),
        );
    });

    test("getBoardMinionStats uses current board attack and health", ({ assert }) => {
        const card = createMinionCard({ cost: 4, attack: 1, health: 5 });
        const minion = createMinionState(card, { attack: 6, health: 2 });

        assert.deepEqual(getBoardMinionStats(minion), {
            cost: 4,
            attack: 6,
            health: 2,
        });
    });

    test("getBoardMinionStats uses base cost over effective cost", ({ assert }) => {
        const card = createMinionCard({ baseCost: 12, cost: 5, attack: 8, health: 8 });
        const minion = createMinionState(card);

        assert.deepEqual(getBoardMinionStats(minion), {
            cost: 12,
            attack: 8,
            health: 8,
        });
    });

    test("getBoardMinionStats uses catalog cost over git revert reduced base cost", ({
        assert,
    }) => {
        const card = createMinionCard({
            cardId: 67,
            baseCost: 2,
            cost: 2,
            attack: 3,
            health: 4,
        });
        const minion = createMinionState(card);

        assert.deepEqual(getBoardMinionStats(minion), {
            cost: 4,
            attack: 3,
            health: 4,
        });
    });

    test("getDeckCardStats uses printed minion stats", ({ assert }) => {
        const card = createMinionCard({ cost: 3, attack: 2, health: 4 });

        assert.deepEqual(getDeckCardStats(card), {
            cost: 3,
            attack: 2,
            health: 4,
        });
    });

    test("getDeckCardStats returns zero attack and health for non-minion cards", ({ assert }) => {
        const spell = createSpellCard({ cost: 2 });

        assert.deepEqual(getDeckCardStats(spell), {
            cost: 2,
            attack: 0,
            health: 0,
        });
    });
});
