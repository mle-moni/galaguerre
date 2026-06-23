import { GALADRIM_CARD_SET_NAME } from "#database/seed_data/card_set_names";
import {
    buildDeckCardIds,
    DECK_SIZE,
    type DeckRecipeEntry,
    recipeTotalCards,
} from "#database/seed_data/balanced_decks";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";

export const createDeckFromRecipe = async (params: {
    userId: number;
    name: string;
    recipe: DeckRecipeEntry[];
    selected: boolean;
}): Promise<Deck> => {
    const { userId, name, recipe, selected } = params;
    const totalCards = recipeTotalCards(recipe);

    if (totalCards !== DECK_SIZE) {
        throw new Error(`Deck recipe "${name}" has ${totalCards} cards, expected ${DECK_SIZE}`);
    }

    const recipeCardIds = [...new Set(recipe.map(({ cardId }) => cardId))];
    const cards = await Card.query().whereIn("id", recipeCardIds).preload("cardSet");
    const cardById = new Map(cards.map((card) => [card.id, card]));

    for (const cardId of recipeCardIds) {
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

    const deck = await Deck.create({
        name,
        userId,
        selected,
    });

    const deckCardIds = buildDeckCardIds(recipe);

    if (deckCardIds.length !== DECK_SIZE) {
        throw new Error(
            `Built deck "${name}" has ${deckCardIds.length} cards, expected ${DECK_SIZE}`,
        );
    }

    await DeckCard.createMany(
        deckCardIds.map((cardId) => ({
            cardId,
            deckId: deck.id,
        })),
    );

    return deck;
};
