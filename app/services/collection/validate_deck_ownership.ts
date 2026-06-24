import type { ApiDeckCardEntry } from "#api_types/deck.types";
import type { DeckValidationErrorDetail } from "#api_types/deck.types";
import Card from "#models/card";
import { getUserCollectionCounts } from "./get_user_collection_counts.js";

export const validateDeckOwnership = async (
    userId: number,
    entries: ApiDeckCardEntry[],
): Promise<{ valid: boolean; errors: DeckValidationErrorDetail[] }> => {
    if (entries.length === 0) {
        return { valid: true, errors: [] };
    }

    const ownedCounts = await getUserCollectionCounts(userId);
    const cardIds = [...new Set(entries.map((entry) => entry.cardId))];
    const cards = await Card.query().whereIn("id", cardIds);
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    const errors: DeckValidationErrorDetail[] = [];

    for (const entry of entries) {
        const owned = ownedCounts.get(entry.cardId) ?? 0;
        if (entry.count > owned) {
            const card = cardsById.get(entry.cardId);
            errors.push({
                cardId: entry.cardId,
                cardLabel: card?.data.name ?? `Carte ${entry.cardId}`,
                reason: `Vous ne possédez que ${owned} exemplaire(s) de cette carte`,
            });
        }
    }

    return { valid: errors.length === 0, errors };
};
