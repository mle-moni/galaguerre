import type { ApiDeck, ApiDeckCardEntry } from "#api_types/deck.types";
import type Deck from "#models/deck";
import { validateDeck } from "../../galaguerre/validation/validate_deck.js";
import { validateDeckComposition } from "../../galaguerre/validation/validate_deck_composition.js";

export const deckCardsToEntries = (deck: Deck): ApiDeckCardEntry[] => {
    const counts = new Map<number, number>();

    for (const card of deck.cards) {
        counts.set(card.id, (counts.get(card.id) ?? 0) + 1);
    }

    return [...counts.entries()].map(([cardId, count]) => ({ cardId, count }));
};

export const serializeDeck = (deck: Deck): ApiDeck => {
    const cards = deckCardsToEntries(deck);
    const composition = validateDeckComposition(cards);
    const cardValidation = validateDeck(deck);

    const compositionErrors = composition.errors.map((e) => e.reason);
    const cardValidationErrors = cardValidation.errors;

    return {
        id: deck.id,
        name: deck.name,
        selected: deck.selected,
        cards,
        cardCount: composition.cardCount,
        valid: composition.valid && cardValidation.valid,
        compositionErrors,
        cardValidationErrors,
    };
};
