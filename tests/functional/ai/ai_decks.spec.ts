import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import Card from "#models/card";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import {
    DECK_SIZE,
    recipeTotalCards,
    type DeckRecipeEntry,
} from "#database/seed_data/balanced_decks";
import { ADVANCED_AI_DECKS } from "#database/seed_data/ai_decks";

test.group("ai:advanced:decks", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    for (const { name, profile, recipe } of ADVANCED_AI_DECKS) {
        test(`"${name}" (${profile}) has exactly ${DECK_SIZE} cards`, ({ assert }) => {
            assert.equal(recipeTotalCards(recipe), DECK_SIZE);
        });

        test(`"${name}" lists each card only once`, ({ assert }) => {
            const cardIds = recipe.map(({ cardId }) => cardId);
            assert.equal(new Set(cardIds).size, cardIds.length);
        });

        test(`"${name}" only uses existing, collectible cards`, async ({ assert }) => {
            const cardIds = recipe.map(({ cardId }) => cardId);
            const cards = await Card.query().whereIn("id", cardIds);

            assert.equal(cards.length, cardIds.length, "some card ids do not exist");

            for (const card of cards) {
                assert.isTrue(card.isCollectible, `card ${card.id} is not collectible`);
            }
        });

        test(`"${name}" respects the copy limit of each rarity`, async ({ assert }) => {
            const cards = await Card.query().whereIn(
                "id",
                recipe.map(({ cardId }) => cardId),
            );
            const rarityByCardId = new Map(cards.map((card) => [card.id, card.rarity]));

            for (const entry of recipe) {
                const rarity = rarityByCardId.get(entry.cardId)!;
                const maxCopies = getMaxCopiesForRarity(rarity);

                assert.isAtMost(
                    entry.copies,
                    maxCopies,
                    `${entry.label} (${rarity}) has ${entry.copies} copies, max ${maxCopies}`,
                );
            }
        });

        test(`"${name}" materialises into ${DECK_SIZE} playable cards`, async ({ assert }) => {
            const cards = await loadTrainingBotCards(recipe as DeckRecipeEntry[]);
            assert.equal(cards.length, DECK_SIZE);
        });
    }

    test("the two advanced decks cover both archetypes", ({ assert }) => {
        const profiles = ADVANCED_AI_DECKS.map(({ profile }) => profile);
        assert.deepEqual([...profiles].sort(), ["AGGRO", "MIDRANGE"]);
    });
});
