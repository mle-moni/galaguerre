import type { ComparisonSnapshot, TargetSnapshot } from "#api_types/game.types";
import type Comparison from "#models/comparison";
import type Target from "#models/target";

export const serializeComparison = (
    comparison: Comparison | null | undefined,
): ComparisonSnapshot | null => {
    if (!comparison) return null;

    return {
        costComparison: comparison.costComparison,
        cost: comparison.cost,
        attackComparison: comparison.attackComparison,
        attack: comparison.attack,
        healthComparison: comparison.healthComparison,
        health: comparison.health,
    };
};

export const serializeTarget = (target: Target | null | undefined): TargetSnapshot | null => {
    if (!target) return null;

    return {
        type: target.type,
        targetTeam: target.targetTeam,
        comparison: serializeComparison(target.comparison),
        tagId: target.tagId,
        excludeSelf: target.excludeSelf ?? false,
        maxTargets: target.maxTargets,
        targetSelectionMode: target.targetSelectionMode,
    };
};
