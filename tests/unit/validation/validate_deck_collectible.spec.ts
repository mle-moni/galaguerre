import { test } from "@japa/runner";
import type { ApiDeckCardEntry } from "#api_types/deck.types";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import {
    validateDeckCollectible,
    validateDeckEntriesCollectible,
} from "../../../app/galaguerre/validation/validate_deck_collectible.js";
import type Card from "#models/card";
import { defaultMinionData } from "#database/seed_data/cards/define_card";

const createCard = (id: number, name: string, isCollectible: boolean): Card =>
    ({
        id,
        isCollectible,
        data: parseMinionData({
            ...defaultMinionData(),
            name,
        }),
    }) as Card;

test.group("validate_deck_collectible", () => {
    test("accepts a deck of collectible cards", ({ assert }) => {
        const cards = [createCard(1, "Lutin", true), createCard(2, "Gobelin", true)];

        const result = validateDeckCollectible(cards);

        assert.isTrue(result.valid);
        assert.deepEqual(result.errors, []);
    });

    test("rejects non-collectible cards in deck", ({ assert }) => {
        const cards = [createCard(1, "Lutin", true), createCard(121, "Légume", false)];

        const result = validateDeckCollectible(cards);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].cardId, 121);
        assert.include(result.errors[0].reason, "Légume");
        assert.include(result.errors[0].reason, "n'est pas collectionnable");
    });

    test("validateDeckEntriesCollectible rejects missing and non-collectible card ids", ({
        assert,
    }) => {
        const entries: ApiDeckCardEntry[] = [
            { cardId: 1, count: 2 },
            { cardId: 121, count: 1 },
            { cardId: 999, count: 1 },
        ];
        const cardsById = new Map([
            [1, createCard(1, "Lutin", true)],
            [121, createCard(121, "Légume", false)],
        ]);

        const result = validateDeckEntriesCollectible(entries, cardsById);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 2);
        assert.include(
            result.errors.map((error) => error.reason).join(" "),
            "n'est pas collectionnable",
        );
        assert.include(result.errors.map((error) => error.reason).join(" "), "introuvable");
    });
});
