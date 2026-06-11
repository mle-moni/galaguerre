import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import User from "#models/user";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { GALADRIM_CARD_SET_NAME } from "../seed_data/card_set_names.js";
import {
    buildDeckCardIds,
    DECK_SIZE,
    recipeTotalCards,
    SEEDED_DECKS,
} from "../seed_data/balanced_decks.js";

export default class extends BaseSeeder {
    async run() {
        const users = await User.all();
        const allCardIds = [
            ...new Set(SEEDED_DECKS.flatMap(({ recipe }) => recipe.map(({ cardId }) => cardId))),
        ];

        const cards = await Card.query().whereIn("id", allCardIds).preload("cardSet");
        const cardById = new Map(cards.map((card) => [card.id, card]));

        for (const cardId of allCardIds) {
            const card = cardById.get(cardId);
            if (!card) {
                throw new Error(`Card not found for deck recipe: ${cardId}`);
            }

            if (card.cardSet.name !== GALADRIM_CARD_SET_NAME) {
                throw new Error(
                    `Card "${card.data.name}" (id ${cardId}) belongs to set "${card.cardSet.name}", expected "${GALADRIM_CARD_SET_NAME}"`,
                );
            }
        }

        for (const user of users) {
            for (const { name, recipe, selected } of SEEDED_DECKS) {
                if (recipeTotalCards(recipe) !== DECK_SIZE) {
                    throw new Error(
                        `Deck recipe "${name}" for ${user.email} has ${recipeTotalCards(recipe)} cards, expected ${DECK_SIZE}`,
                    );
                }

                const deck = await Deck.create({
                    name,
                    userId: user.id,
                    selected,
                });

                const deckCardIds = buildDeckCardIds(recipe);

                if (deckCardIds.length !== DECK_SIZE) {
                    throw new Error(
                        `Built deck "${name}" for ${user.email} has ${deckCardIds.length} cards, expected ${DECK_SIZE}`,
                    );
                }

                await DeckCard.createMany(
                    deckCardIds.map((cardId) => ({
                        cardId,
                        deckId: deck.id,
                    })),
                );
            }
        }
    }
}
