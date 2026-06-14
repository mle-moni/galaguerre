import type { ApiDeckCardEntry } from "#api_types/deck.types";
import type Card from "#models/card";

export type DeckCollectibleError = {
    cardId: number;
    cardLabel: string;
    reason: string;
};

export type DeckCollectibleResult = {
    valid: boolean;
    errors: DeckCollectibleError[];
};

const nonCollectibleError = (card: Card): DeckCollectibleError => ({
    cardId: card.id,
    cardLabel: card.data.name,
    reason: `La carte « ${card.data.name} » n'est pas collectionnable`,
});

const missingCardError = (cardId: number): DeckCollectibleError => ({
    cardId,
    cardLabel: "inconnue",
    reason: `La carte #${cardId} est introuvable`,
});

export const validateDeckCollectible = (cards: Card[]): DeckCollectibleResult => {
    const errors: DeckCollectibleError[] = [];

    for (const card of cards) {
        if (!card.isCollectible) {
            errors.push(nonCollectibleError(card));
        }
    }

    return { valid: errors.length === 0, errors };
};

export const validateDeckEntriesCollectible = (
    entries: ApiDeckCardEntry[],
    cardsById: Map<number, Card>,
): DeckCollectibleResult => {
    const errors: DeckCollectibleError[] = [];
    const uniqueCardIds = [...new Set(entries.map((entry) => entry.cardId))];

    for (const cardId of uniqueCardIds) {
        const card = cardsById.get(cardId);
        if (!card) {
            errors.push(missingCardError(cardId));
            continue;
        }

        if (!card.isCollectible) {
            errors.push(nonCollectibleError(card));
        }
    }

    return { valid: errors.length === 0, errors };
};
