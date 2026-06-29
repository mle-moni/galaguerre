import {
    drawPackCardsWithoutReplacement,
    type PackDrawRandom,
} from "#services/collection/draw_weighted_pack_cards";
import { test } from "@japa/runner";

const sequentialPackDrawRandom = (legendaryRolls: boolean[], indices: number[]): PackDrawRandom => {
    let legendaryIndex = 0;
    let pickIndexCounter = 0;
    return {
        rollLegendarySlot: () => legendaryRolls[legendaryIndex++],
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
            sequentialPackDrawRandom([false, false, false], [0, 0, 0]),
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
            sequentialPackDrawRandom([true], [0]),
        );

        assert.deepEqual(drawn, [2]);
    });

    test("draws a common card on a common roll", ({ assert }) => {
        const cards = [
            { id: 1, rarity: "COMMON" as const },
            { id: 2, rarity: "LEGENDARY" as const },
        ];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom([false], [0]),
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
            sequentialPackDrawRandom([true], [0]),
        );

        assert.deepEqual(drawn, [1]);
    });

    test("falls back to legendary when common roll hits an empty common pool", ({ assert }) => {
        const cards = [{ id: 1, rarity: "LEGENDARY" as const }];

        const drawn = drawPackCardsWithoutReplacement(
            cards,
            1,
            sequentialPackDrawRandom([false], [0]),
        );

        assert.deepEqual(drawn, [1]);
    });
});
