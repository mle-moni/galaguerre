import type { CardFilterSnapshot, PlayerCard } from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import { getCollectibleCardTemplates } from "#api_types/card_preview";
import { randomUUID } from "node:crypto";
import { shuffleArray } from "../../utils/array.js";

const instantiateDiscoverOption = (template: PlayerCard): PlayerCard => ({
    ...structuredClone(template),
    uuid: randomUUID(),
});

export const generateDiscoverOptions = (
    filter: CardFilterSnapshot,
    optionCount: number,
): PlayerCard[] => {
    if (optionCount <= 0) return [];

    const matches = getCollectibleCardTemplates().filter((template) =>
        deckCardMatchesFilter(template, filter),
    );

    if (matches.length === 0) return [];

    const shuffled = shuffleArray(matches);
    return shuffled.slice(0, Math.min(optionCount, shuffled.length)).map(instantiateDiscoverOption);
};
