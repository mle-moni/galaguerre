import type { ApiDeckCardEntry } from "#api_types/deck.types";

export const DECK_MIN_CARDS = 15;
export const DECK_MAX_CARDS = 20;
export const DECK_MAX_COPIES_PER_CARD = 2;

export type DeckCompositionError = {
    reason: string;
    cardId?: number;
};

export type DeckCompositionResult = {
    valid: boolean;
    errors: DeckCompositionError[];
    cardCount: number;
};

export const validateDeckCompositionForSave = (
    cards: ApiDeckCardEntry[],
): DeckCompositionResult => {
    const errors: DeckCompositionError[] = [];
    let cardCount = 0;

    for (const entry of cards) {
        if (entry.count < 1) {
            errors.push({
                cardId: entry.cardId,
                reason: "Le nombre d'exemplaires doit être au moins 1",
            });
            continue;
        }

        if (entry.count > DECK_MAX_COPIES_PER_CARD) {
            errors.push({
                cardId: entry.cardId,
                reason: `Maximum ${DECK_MAX_COPIES_PER_CARD} exemplaires par carte`,
            });
        }

        cardCount += entry.count;
    }

    if (cardCount > DECK_MAX_CARDS) {
        errors.push({
            reason: `Le deck ne peut pas contenir plus de ${DECK_MAX_CARDS} cartes (actuellement ${cardCount})`,
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        cardCount,
    };
};

export const validateDeckComposition = (cards: ApiDeckCardEntry[]): DeckCompositionResult => {
    const result = validateDeckCompositionForSave(cards);

    if (result.cardCount < DECK_MIN_CARDS) {
        result.errors.push({
            reason: `Le deck doit contenir entre ${DECK_MIN_CARDS} et ${DECK_MAX_CARDS} cartes (actuellement ${result.cardCount})`,
        });
        result.valid = false;
    }

    return result;
};
