import Card from "#models/card";
import { buildDeckCardIds } from "../../../database/seed_data/balanced_decks.js";
import { TRAINING_BOT_DECK_RECIPE } from "../../../database/seed_data/training_bot_deck.js";

export const loadTrainingBotCards = async (): Promise<Card[]> => {
    const labels = [...new Set(TRAINING_BOT_DECK_RECIPE.map(({ label }) => label))];
    const cards = await Card.query().whereIn("label", labels);

    const cardByLabel = new Map(cards.map((card) => [card.label, card]));
    const cardIds = buildDeckCardIds(TRAINING_BOT_DECK_RECIPE, cardByLabel);
    const cardById = new Map(cards.map((card) => [card.id, card]));

    return cardIds.map((cardId) => {
        const card = cardById.get(cardId);
        if (!card) {
            throw new Error(`Training bot deck card not found: ${cardId}`);
        }

        return card;
    });
};
