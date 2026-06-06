import type {
    CardActionSnapshot,
    CardFilterSnapshot,
    ComparisonSnapshot,
} from "#api_types/game.types";
import type Action from "#models/action";
import type CardFilter from "#models/card_filter";
import type Comparison from "#models/comparison";
import { serializeBoost } from "./boost_utils.js";

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

const serializeCardFilter = (
    cardFilter: CardFilter | null | undefined,
): CardFilterSnapshot | null => {
    if (!cardFilter) return null;

    return {
        type: cardFilter.type,
        comparison: serializeComparison(cardFilter.comparison),
        tagIds: (cardFilter.tags ?? []).map((tag) => tag.id),
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
        drawCardFilter: serializeCardFilter(action.drawCardFilter),
        enemyDrawCardFilter: serializeCardFilter(action.enemyDrawCardFilter),
        boost: serializeBoost(action.boost),
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
