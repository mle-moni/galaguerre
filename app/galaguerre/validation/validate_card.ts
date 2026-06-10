import type { DeckValidationErrorDetail } from "#api_types/deck.types";
import type Card from "#models/card";
import { safeParseCardData } from "#galaguerre/card_definition.schema";

export const validateCard = (card: Card): DeckValidationErrorDetail[] => {
    const result = safeParseCardData(card.type, card.data);

    if (result.success) {
        return [];
    }

    return result.error.issues.map((issue) => ({
        cardId: card.id,
        cardLabel: card.label,
        reason: issue.message,
    }));
};
