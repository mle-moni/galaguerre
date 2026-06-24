import { test } from "@japa/runner";
import {
    DECK_MAX_CARDS,
    DECK_MAX_COPIES_PER_CARD,
    DECK_MIN_CARDS,
    validateDeckComposition,
    validateDeckCompositionForSave,
} from "../../../app/galaguerre/validation/validate_deck_composition.js";

test.group("validate_deck_composition", () => {
    test("accepts a valid deck within limits", ({ assert }) => {
        const entries = Array.from({ length: 15 }, (_, index) => ({
            cardId: index + 1,
            count: 2,
        }));

        const result = validateDeckComposition(entries);

        assert.isTrue(result.valid);
        assert.equal(result.cardCount, 30);
        assert.deepEqual(result.errors, []);
    });

    test("rejects more than max copies per card", ({ assert }) => {
        const result = validateDeckComposition([
            { cardId: 1, count: DECK_MAX_COPIES_PER_CARD + 1 },
        ]);

        assert.isFalse(result.valid);
        assert.equal(result.errors[0].cardId, 1);
        assert.include(result.errors[0].reason, String(DECK_MAX_COPIES_PER_CARD));
    });

    test("rejects more than one copy of a legendary card", ({ assert }) => {
        const rarityByCardId = new Map([[42, "LEGENDARY" as const]]);

        const result = validateDeckCompositionForSave([{ cardId: 42, count: 2 }], rarityByCardId);

        assert.isFalse(result.valid);
        assert.equal(result.errors[0].cardId, 42);
        assert.include(result.errors[0].reason, "1 exemplaire");
    });

    test("accepts one copy of a legendary card", ({ assert }) => {
        const rarityByCardId = new Map([[42, "LEGENDARY" as const]]);

        const result = validateDeckCompositionForSave([{ cardId: 42, count: 1 }], rarityByCardId);

        assert.isTrue(result.valid);
    });

    test("rejects more than max total cards", ({ assert }) => {
        const entries = Array.from({ length: 16 }, (_, index) => ({
            cardId: index + 1,
            count: 2,
        }));

        const result = validateDeckComposition(entries);

        assert.isFalse(result.valid);
        assert.equal(result.cardCount, 32);
        assert.include(result.errors[0].reason, String(DECK_MAX_CARDS));
    });

    test("rejects a deck with fewer than min cards", ({ assert }) => {
        const result = validateDeckComposition([
            { cardId: 1, count: 2 },
            { cardId: 2, count: 2 },
            { cardId: 3, count: 1 },
        ]);

        assert.isFalse(result.valid);
        assert.equal(result.cardCount, 5);
        assert.include(result.errors[0].reason, String(DECK_MIN_CARDS));
    });

    test("accepts an empty deck for save but not for play", ({ assert }) => {
        const saveResult = validateDeckCompositionForSave([]);
        const playResult = validateDeckComposition([]);

        assert.isTrue(saveResult.valid);
        assert.equal(saveResult.cardCount, 0);

        assert.isFalse(playResult.valid);
        assert.include(playResult.errors[0].reason, String(DECK_MIN_CARDS));
    });

    test("rejects zero or negative counts", ({ assert }) => {
        const result = validateDeckComposition([{ cardId: 1, count: 0 }]);

        assert.isFalse(result.valid);
        assert.equal(result.errors[0].cardId, 1);
    });
});
