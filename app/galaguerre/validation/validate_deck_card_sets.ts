import type Card from "#models/card";

export type DeckCardSetValidationError = {
    cardId: number;
    cardLabel: string;
    cardSetName: string;
    reason: string;
};

export type DeckCardSetValidationResult = {
    valid: boolean;
    errors: DeckCardSetValidationError[];
};

export const validateDeckCardSets = (cards: Card[]): DeckCardSetValidationResult => {
    const errors: DeckCardSetValidationError[] = [];

    for (const card of cards) {
        if (!card.cardSet) {
            errors.push({
                cardId: card.id,
                cardLabel: card.label,
                cardSetName: "inconnu",
                reason: `La carte « ${card.label} » n'appartient à aucun set`,
            });
            continue;
        }

        if (card.cardSet.isActive) continue;

        errors.push({
            cardId: card.id,
            cardLabel: card.label,
            cardSetName: card.cardSet.name,
            reason: `La carte « ${card.label} » appartient au set « ${card.cardSet.name} » qui n'est pas actif`,
        });
    }

    return { valid: errors.length === 0, errors };
};
