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

const filterMinionTemplates = (
    parameters: ReconvertParametersSnapshot,
    comparison: CardFilterSnapshot["comparison"],
): MinionCard[] => {
    const filter: CardFilterSnapshot = {
        type: parameters.type,
        comparison,
        tags: parameters.tags,
    };

    return getAllMinionCardTemplates().filter((template) =>
        deckCardMatchesFilter(template, filter),
    );
};

export const resolveReconvertTemplate = (
    parameters: ReconvertParametersSnapshot,
    sourceMinion: MinionState,
): MinionCard | undefined => {
    if (parameters.cardId !== null) {
        return getMinionCardTemplateById(parameters.cardId);
    }

    const sourceStats = getBoardMinionStats(sourceMinion);
    const resolvedComparison = parameters.relativeToSource
        ? resolveRelativeComparison(parameters.comparison, sourceStats)
        : parameters.comparison;

    let matches = filterMinionTemplates(parameters, resolvedComparison);

    const comparison = parameters.comparison;
    if (
        matches.length === 0 &&
        parameters.relativeToSource &&
        comparison !== null &&
        comparison.costComparison !== null &&
        comparison.cost !== null &&
        comparison.cost < 0 &&
        resolvedComparison !== null &&
        resolvedComparison.cost !== null &&
        resolvedComparison.cost < sourceStats.cost
    ) {
        matches = filterMinionTemplates(parameters, {
            costComparison: "=",
            cost: sourceStats.cost,
            attackComparison: null,
            attack: null,
            healthComparison: null,
            health: null,
        });
    }

    if (matches.length === 0) return undefined;

    return matches[randomIntInRange(0, matches.length - 1)];
};
