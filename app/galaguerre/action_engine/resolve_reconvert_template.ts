import type {
    CardFilterSnapshot,
    MinionCard,
    MinionState,
    ReconvertParametersSnapshot,
} from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import { getBoardMinionStats, resolveRelativeComparison } from "#api_types/comparison_matching";
import { randomIntInRange } from "../../utils/random.js";
import { getAllMinionCardTemplates, getMinionCardTemplateById } from "../card_catalog.js";

export const resolveReconvertTemplate = (
    parameters: ReconvertParametersSnapshot,
    sourceMinion: MinionState,
): MinionCard | undefined => {
    if (parameters.cardId !== null) {
        return getMinionCardTemplateById(parameters.cardId);
    }

    const resolvedComparison = parameters.relativeToSource
        ? resolveRelativeComparison(parameters.comparison, getBoardMinionStats(sourceMinion))
        : parameters.comparison;

    const filter: CardFilterSnapshot = {
        type: parameters.type,
        comparison: resolvedComparison,
        tags: parameters.tags,
    };

    const matches = getAllMinionCardTemplates().filter((template) =>
        deckCardMatchesFilter(template, filter),
    );

    if (matches.length === 0) return undefined;

    return matches[randomIntInRange(0, matches.length - 1)];
};
