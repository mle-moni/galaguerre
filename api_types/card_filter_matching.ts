import type { CardFilterSnapshot, PlayerCard } from "./game.types.js";
import { getDeckCardStats, matchesComparison } from "./comparison_matching.js";

export const deckCardMatchesFilter = (card: PlayerCard, filter: CardFilterSnapshot): boolean => {
    if (card.type !== filter.type) return false;

    if (!matchesComparison(getDeckCardStats(card), filter.comparison)) {
        return false;
    }

    for (const tag of filter.tags) {
        if (!card.tags.includes(tag)) return false;
    }

    return true;
};
