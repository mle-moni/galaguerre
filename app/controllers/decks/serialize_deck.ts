import type { ApiDeck } from "#api_types/deck.types";
import type Deck from "#models/deck";
import { validateDeck } from "../../galaguerre/validation/validate_deck.js";
import { validateDeckCardSets } from "../../galaguerre/validation/validate_deck_card_sets.js";
import { validateDeckComposition } from "../../galaguerre/validation/validate_deck_composition.js";
import { deckCardsToEntries } from "./deck_utils.js";

export { deckCardsToEntries };

export const serializeDeck = (deck: Deck): ApiDeck => {
    const cards = deckCardsToEntries(deck);
    const composition = validateDeckComposition(cards);
    const cardValidation = validateDeck(deck);
    const cardSetValidation = validateDeckCardSets(deck.cards);

    const compositionErrors = [
        ...composition.errors.map((e) => e.reason),
        ...cardSetValidation.errors.map((e) => e.reason),
    ];
    const cardValidationErrors = cardValidation.errors;

    return {
        id: deck.id,
        name: deck.name,
        selected: deck.selected,
        cards,
        cardCount: composition.cardCount,
        valid: composition.valid && cardValidation.valid && cardSetValidation.valid,
        compositionErrors,
        cardValidationErrors,
    };
};
