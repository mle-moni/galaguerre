import type Deck from "#models/deck";
import { validateCard } from "./validate_card.js";

export type DeckValidationErrorDetail = {
    cardId: number;
    cardLabel: string;
    actionId?: number;
    actionInternalLabel?: string;
    reason: string;
};

export type DeckValidationResult = {
    valid: boolean;
    errors: DeckValidationErrorDetail[];
};

export class DeckValidationError extends Error {
    errors: DeckValidationErrorDetail[];

    constructor(errors: DeckValidationErrorDetail[]) {
        super(`Invalid cards in deck: ${errors.length} error(s)`);
        this.name = "DeckValidationError";
        this.errors = errors;
    }
}

export const validateDeck = (deck: Deck): DeckValidationResult => {
    const errors = deck.cards.flatMap((card) => validateCard(card));
    return { valid: errors.length === 0, errors };
};

export const assertDeckValid = (deck: Deck): void => {
    const result = validateDeck(deck);
    if (!result.valid) {
        throw new DeckValidationError(result.errors);
    }
};
