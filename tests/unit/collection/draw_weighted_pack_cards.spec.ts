import {
    drawPackCardsWithoutReplacement,
    type PackDrawRandom,
} from "#services/collection/draw_weighted_pack_cards";
import type { CardRarity } from "#api_types/card_rarity.types";
import { test } from "@japa/runner";

const sequentialPackDrawRandom = (rarities: CardRarity[], indices: number[]): PackDrawRandom => {
    let rarityIndex = 0;
    let pickIndexCounter = 0;
    return {
        rollRarity: () => rarities[rarityIndex++],
        pickIndex: () => indices[pickIndexCounter++],
    };
};
test.group("draw pack cards", () => {
    test("draws without replacement", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "COMMON" as const },
            { id: 3, rarity: "LEGENDARY" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            3,
            sequentialPackDrawRandom(["COMMON", "COMMON", "COMMON"], [0, 0, 0]),
        );

        assert.deepEqual(drawn, [1, 2, 3]);
        assert.equal(new Set(drawn).size, 3);
    });

    test("draws a legendary card on a legendary roll", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "LEGENDARY" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["LEGENDARY"], [0]),
        );

        assert.deepEqual(drawn, [2]);
    });

    test("draws an epic card on an epic roll", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "EPIC" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["EPIC"], [0]),
        );

        assert.deepEqual(drawn, [2]);
    });

    test("draws a rare card on a rare roll", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "RARE" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["RARE"], [0]),
        );

        assert.deepEqual(drawn, [2]);
    });

    test("draws a common card on a common roll", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "COMMON" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["COMMON"], [0]),
        );

        assert.deepEqual(drawn, [1]);
    });

    test("falls back to common when legendary roll hits an empty legendary pool", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "COMMON" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["LEGENDARY"], [0]),
        );

        assert.deepEqual(drawn, [1]);
    });

    test("falls back to rare when epic roll hits an empty epic pool", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "RARE" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["EPIC"], [0]),
        );

        assert.deepEqual(drawn, [2]);
    });

    test("falls back to epic when rare roll hits an empty rare pool", ({ assert }) => {
        const cards = [{ id: 1, rarity: "EPIC" as const }];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["RARE"], [0]),
        );

        assert.deepEqual(drawn, [1]);
    });

    test("falls back to legendary when common roll hits an empty common pool", ({ assert }) => {
        const cards = [{ id: 1, rarity: "LEGENDARY" as const }];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["COMMON"], [0]),
        );

        assert.deepEqual(drawn, [1]);
    });

    test("guarantees at least one rare+ card when draw is all commons", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "COMMON" as const },
            { id: 3, rarity: "COMMON" as const },
            { id: 4, rarity: "COMMON" as const },
            { id: 5, rarity: "RARE" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            4,
            sequentialPackDrawRandom(["COMMON", "COMMON", "COMMON", "COMMON"], [0, 0, 0, 0, 0, 0]),
        );

        assert.isTrue(drawn.includes(5));
        assert.isTrue(
            drawn.some((id) => cards.find((card) => card.id === id)!.rarity !== "COMMON"),
        );
    });

    test("does not alter draw when a rare+ card is already present", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "RARE" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom(["RARE"], [0]),
        );

        assert.deepEqual(drawn, [2]);
    });

    test("guarantees distinct cards when all commons are drawn from a larger pool", ({
        assert,
    }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "COMMON" as const },
            { id: 3, rarity: "COMMON" as const },
            { id: 4, rarity: "COMMON" as const },
            { id: 5, rarity: "COMMON" as const },
            { id: 6, rarity: "RARE" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            5,
            sequentialPackDrawRandom(
                ["COMMON", "COMMON", "COMMON", "COMMON", "COMMON"],
                [0, 0, 0, 0, 0, 0, 0],
            ),
        );

        assert.equal(new Set(drawn).size, 5);
        assert.isTrue(
            drawn.some((id) => cards.find((card) => card.id === id)!.rarity !== "COMMON"),
        );
    });

    test("falls back to epic when guaranteeing rare+ and pool has no rares", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "COMMON" as const },
            { id: 3, rarity: "EPIC" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            2,
            sequentialPackDrawRandom(["COMMON", "COMMON"], [0, 0, 0, 0]),
        );

        assert.deepEqual(drawn, [3, 2]);
    });
});
