import type { ApiDeckCardEntry } from "#api_types/deck.types";
import type { CardRarity } from "#api_types/card_rarity.types";
import { validateDeckCardEntries } from "#controllers/decks/deck_utils";
import { validateDeckComposition } from "#galaguerre/validation/validate_deck_composition";
import { validateDeckCardSets } from "#galaguerre/validation/validate_deck_card_sets";
import { validateDeckCollectible } from "#galaguerre/validation/validate_deck_collectible";
import { validateCard } from "#galaguerre/validation/validate_card";
import Card from "#models/card";

export const validateSharedDeckSnapshot = async (cards: ApiDeckCardEntry[]) => {
    const cardEntries = await validateDeckCardEntries(cards);
    const cardIds = [...new Set(cards.map((entry) => entry.cardId))];
    const loadedCards =
        cardIds.length === 0 ? [] : await Card.query().whereIn("id", cardIds).preload("cardSet");
    const cardsById = new Map(loadedCards.map((card) => [card.id, card]));

    const composition = validateDeckComposition(cards, cardEntries.rarityByCardId);
    const cardSetValidation = validateDeckCardSets(loadedCards);
    const collectibleValidation = validateDeckCollectible(loadedCards);
    const cardValidationErrors = loadedCards.flatMap((card) => validateCard(card));

    const compositionErrors = [
        ...cardEntries.errors.map((error) => error.reason),
        ...composition.errors.map((error) => error.reason),
        ...cardSetValidation.errors.map((error) => error.reason),
        ...collectibleValidation.errors.map((error) => error.reason),
    ];

    const valid =
        cardEntries.valid &&
        composition.valid &&
        cardSetValidation.valid &&
        collectibleValidation.valid &&
        cardValidationErrors.length === 0;

    return {
        valid,
        compositionErrors,
        cardValidationErrors,
        rarityByCardId: cardEntries.rarityByCardId as Map<number, CardRarity>,
        cardsById,
    };
};
