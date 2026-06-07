import { test } from "@japa/runner";
import {
    DECK_MAX_CARDS,
    DECK_MAX_COPIES_PER_CARD,
    validateDeckComposition,
} from "../../../app/galaguerre/validation/validate_deck_composition.js";

test.group("validate_deck_composition", () => {
    test("accepts a valid deck within limits", ({ assert }) => {
        const result = validateDeckComposition([
            { cardId: 1, count: 2 },
            { cardId: 2, count: 2 },
            { cardId: 3, count: 1 },
        ]);

        assert.isTrue(result.valid);
        assert.equal(result.cardCount, 5);
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

    test("rejects more than max total cards", ({ assert }) => {
        const entries = Array.from({ length: 11 }, (_, index) => ({
            cardId: index + 1,
            count: 2,
        }));

        const result = validateDeckComposition(entries);

        assert.isFalse(result.valid);
        assert.equal(result.cardCount, 22);
        assert.include(result.errors[0].reason, String(DECK_MAX_CARDS));
    });

    test("accepts an empty deck", ({ assert }) => {
        const result = validateDeckComposition([]);

        assert.isTrue(result.valid);
        assert.equal(result.cardCount, 0);
    });

    test("rejects zero or negative counts", ({ assert }) => {
        const result = validateDeckComposition([{ cardId: 1, count: 0 }]);

        assert.isFalse(result.valid);
        assert.equal(result.errors[0].cardId, 1);
    });
});
