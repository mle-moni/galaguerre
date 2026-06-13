import Card from "#models/card";
import { buildDeckCardIds } from "../../../database/seed_data/balanced_decks.js";
import { TRAINING_BOT_DECK_RECIPE } from "../../../database/seed_data/training_bot_deck.js";

export const loadTrainingBotCards = async (): Promise<Card[]> => {
    const cardIds = [...new Set(TRAINING_BOT_DECK_RECIPE.map(({ cardId }) => cardId))];
    const cards = await Card.query().whereIn("id", cardIds);
    const cardById = new Map(cards.map((card) => [card.id, card]));
    const deckCardIds = buildDeckCardIds(TRAINING_BOT_DECK_RECIPE);

    return deckCardIds.map((cardId) => {
        const card = cardById.get(cardId);
        if (!card) {
            throw new Error(`Training bot deck card not found: ${cardId}`);
        }

        return card;
    });
};
