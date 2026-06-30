import { test } from "@japa/runner";
import { isCardCollectible } from "#api_types/card_preview";
import { createCardFilterSnapshot, createComparisonSnapshot } from "#tests/helpers/game/fixtures";
import { generateDiscoverOptions } from "#galaguerre/discover/generate_discover_options";

test.group("generate_discover_options", () => {
    test("returns only collectible cards", ({ assert }) => {
        const options = generateDiscoverOptions(createCardFilterSnapshot({ type: "MINION" }), 10);

        assert.isAbove(options.length, 0);
        for (const option of options) {
            assert.isTrue(isCardCollectible(option.cardId));
            assert.notEqual(option.cardId, 121);
        }
    });

    test("returns unique card ids", ({ assert }) => {
        const options = generateDiscoverOptions(createCardFilterSnapshot({ type: "MINION" }), 3);

        const cardIds = options.map((option) => option.cardId);
        assert.equal(new Set(cardIds).size, cardIds.length);
    });

    test("applies cost comparison filters", ({ assert }) => {
        const options = generateDiscoverOptions(
            createCardFilterSnapshot({
                type: "MINION",
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: 1,
                }),
            }),
            3,
        );

        assert.isAbove(options.length, 0);
        for (const option of options) {
            assert.equal(option.cost, 1);
        }
    });

    test("returns fewer options when pool is smaller than optionCount", ({ assert }) => {
        const options = generateDiscoverOptions(
            createCardFilterSnapshot({
                type: "SPELL",
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: 99,
                }),
            }),
            3,
        );

        assert.isAtMost(options.length, 3);
    });

    test("assigns unique uuids to each option", ({ assert }) => {
        const options = generateDiscoverOptions(createCardFilterSnapshot({ type: "MINION" }), 3);

        const uuids = options.map((option) => option.uuid);
        assert.equal(new Set(uuids).size, uuids.length);
    });
});
