import type { CardFilterSnapshot, PlayerCard } from "#api_types/game.types";
import { deckCardMatchesFilter, cardFilterLabelTags } from "#api_types/card_filter_matching";
import { getAllCardTemplates, getCollectibleCardTemplates } from "#api_types/card_preview";
import { randomUUID } from "node:crypto";
import { shuffleArray } from "../../utils/array.js";

const instantiateDiscoverOption = (
    template: PlayerCard,
    ownedGoldenCardIds: ReadonlySet<number>,
): PlayerCard => ({
    ...structuredClone(template),
    uuid: randomUUID(),
    isGolden: ownedGoldenCardIds.has(template.cardId) && Boolean(template.goldenVideoUrl),
});

const getDiscoverPool = (filter: CardFilterSnapshot): PlayerCard[] => {
    const pool =
        cardFilterLabelTags(filter).length > 0
            ? getAllCardTemplates()
            : getCollectibleCardTemplates();

    return pool.filter((template) => deckCardMatchesFilter(template, filter));
};

const collectDiscoverMatches = (
    filter: CardFilterSnapshot | null,
    alternatives: CardFilterSnapshot[],
): PlayerCard[] => {
    if (alternatives.length > 0) {
        const seenCardIds = new Set<number>();
        const matches: PlayerCard[] = [];

        for (const alternative of alternatives) {
            for (const card of getDiscoverPool(alternative)) {
                if (seenCardIds.has(card.cardId)) continue;
                seenCardIds.add(card.cardId);
                matches.push(card);
            }
        }

        return matches;
    }

    if (!filter) return [];

    return getDiscoverPool(filter);
};

export const generateDiscoverOptions = (
    filter: CardFilterSnapshot | null,
    optionCount: number,
    filterAlternatives: CardFilterSnapshot[] = [],
    ownedGoldenCardIds: readonly number[] = [],
): PlayerCard[] => {
    if (optionCount <= 0) return [];

    const matches = collectDiscoverMatches(filter, filterAlternatives);
    if (matches.length === 0) return [];

    const ownedGolden = new Set(ownedGoldenCardIds);
    const shuffled = shuffleArray(matches);
    return shuffled
        .slice(0, Math.min(optionCount, shuffled.length))
        .map((template) => instantiateDiscoverOption(template, ownedGolden));
};
