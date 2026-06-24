import { PACK_DRAW_WEIGHT_BY_RARITY } from "#api_types/card_rarity.types";
import { drawWeightedPackCardsWithoutReplacement } from "#services/collection/draw_weighted_pack_cards";
import { test } from "@japa/runner";

test.group("draw weighted pack cards", () => {
    test("draws without replacement", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "COMMON" as const },
            { id: 3, rarity: "LEGENDARY" as const },
        ];

        const drawn = drawWeightedPackCardsWithoutReplacement(cards, 3, () => 0);

        assert.deepEqual(drawn, [1, 2, 3]);
        assert.equal(new Set(drawn).size, 3);
    });

    test("favors common cards over legendary cards with equal pool sizes", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "LEGENDARY" as const },
        ];

        const commonWeight = PACK_DRAW_WEIGHT_BY_RARITY.COMMON;
        const legendaryWeight = PACK_DRAW_WEIGHT_BY_RARITY.LEGENDARY;
        const totalWeight = commonWeight + legendaryWeight;
        const legendaryRandom = commonWeight / totalWeight + 0.01;

        const drawnAsCommonFirst = drawWeightedPackCardsWithoutReplacement(cards, 1, () => 0);
        assert.deepEqual(drawnAsCommonFirst, [1]);

        const drawnAsLegendaryFirst = drawWeightedPackCardsWithoutReplacement(
            cards,
            1,
            () => legendaryRandom,
        );
        assert.deepEqual(drawnAsLegendaryFirst, [2]);
    });
});
