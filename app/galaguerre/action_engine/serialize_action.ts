import type { CardActionSnapshot, ComparisonSnapshot } from "#api_types/game.types";
import type Action from "#models/action";
import type Comparison from "#models/comparison";

const serializeComparison = (
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

export const serializeAction = (action: Action): CardActionSnapshot => {
    const toolToTarget = action.toolToTargets?.[0];
    const target = toolToTarget?.target;

    return {
        type: action.type,
        isTargeted: action.isTargeted,
        damage: action.damage,
        heal: action.heal,
        drawCount: action.drawCount,
        enemyDrawCount: action.enemyDrawCount,
        target: target
            ? {
                  type: target.type,
                  targetTeam: target.targetTeam,
                  comparison: serializeComparison(target.comparison),
                  tagId: target.tagId,
              }
            : null,
    };
};
