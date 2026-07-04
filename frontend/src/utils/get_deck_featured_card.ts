import type { CardRarity } from "#api_types/card_rarity.types";
import { getGoldCoinsPerCardBuy } from "#api_types/card_rarity.types";
import type { ApiCatalogCard } from "#api_types/deck.types";

const RARITY_RANK: Record<CardRarity, number> = {
    COMMON: 0,
    RARE: 1,
    EPIC: 2,
    LEGENDARY: 3,
};

export const getDeckFeaturedCard = (
    composition: Map<number, number>,
    catalogById: Map<number, ApiCatalogCard>,
): ApiCatalogCard | null => {
    let best: ApiCatalogCard | null = null;

    for (const [cardId] of composition) {
        const card = catalogById.get(cardId);
        if (!card) continue;

        if (!best) {
            best = card;
            continue;
        }

        const rarityDiff = RARITY_RANK[card.rarity] - RARITY_RANK[best.rarity];
        if (rarityDiff > 0) {
            best = card;
            continue;
        }
        if (rarityDiff < 0) continue;

        const priceDiff = getGoldCoinsPerCardBuy(card.rarity) - getGoldCoinsPerCardBuy(best.rarity);
        if (priceDiff > 0) {
            best = card;
            continue;
        }
        if (priceDiff < 0) continue;

        if (card.cost > best.cost) {
            best = card;
            continue;
        }
        if (card.cost < best.cost) continue;

        if (card.label.localeCompare(best.label) < 0) {
            best = card;
        }
    }

    return best;
};
