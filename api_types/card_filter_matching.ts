import type { CardFilterSnapshot, PlayerCard } from "./game.types.js";
import type { CardLabelTag, CardTag } from "./card.types.js";
import { getDeckCardStats, matchesComparison } from "./comparison_matching.js";

export const cardFilterTags = (filter: CardFilterSnapshot): CardTag[] => filter.tags ?? [];

export const cardFilterLabelTags = (filter: CardFilterSnapshot): CardLabelTag[] =>
    filter.labelTags ?? [];

export const deckCardMatchesFilter = (card: PlayerCard, filter: CardFilterSnapshot): boolean => {
    if (filter.type !== "ANY" && card.type !== filter.type) return false;

    if (!matchesComparison(getDeckCardStats(card), filter.comparison)) {
        return false;
    }

    for (const tag of cardFilterTags(filter)) {
        if (!card.tags.includes(tag)) return false;
    }

    for (const labelTag of cardFilterLabelTags(filter)) {
        if (!card.labelTags.includes(labelTag)) return false;
    }

    if (filter.rarity !== null && card.rarity !== filter.rarity) return false;

    return true;
};
