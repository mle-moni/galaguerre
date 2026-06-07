import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import User from "#models/user";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import {
    BALANCED_DECKS_BY_EMAIL,
    buildDeckCardIds,
    DECK_SIZE,
    recipeTotalCards,
} from "../seed_data/balanced_decks.js";

export default class extends BaseSeeder {
    async run() {
        const users = await User.all();
        const allLabels = [
            ...new Set(
                Object.values(BALANCED_DECKS_BY_EMAIL).flatMap(({ recipe }) =>
                    recipe.map(({ label }) => label),
                ),
            ),
        ];

        const cards = await Card.query().whereIn("label", allLabels);
        const cardByLabel = new Map(cards.map((card) => [card.label, card]));

        for (const user of users) {
            const deckConfig = BALANCED_DECKS_BY_EMAIL[user.email];
            if (!deckConfig) {
                throw new Error(`No balanced deck recipe configured for user: ${user.email}`);
            }

            const { name, recipe } = deckConfig;

            if (recipeTotalCards(recipe) !== DECK_SIZE) {
                throw new Error(
                    `Deck recipe "${name}" for ${user.email} has ${recipeTotalCards(recipe)} cards, expected ${DECK_SIZE}`,
                );
            }

            const deck = await Deck.create({
                name,
                userId: user.id,
                selected: true,
            });

            const deckCardIds = buildDeckCardIds(recipe, cardByLabel);

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
