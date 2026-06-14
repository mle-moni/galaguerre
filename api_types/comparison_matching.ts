import type {
    ComparableStats,
    ComparisonOperator,
    ComparisonSnapshot,
    MinionState,
    PlayerCard,
} from "./game.types.js";

export type { ComparableStats };

export const compareValue = (
    value: number,
    operator: ComparisonOperator,
    threshold: number,
): boolean => {
    switch (operator) {
        case "<":
            return value < threshold;
        case ">":
            return value > threshold;
        case "=":
            return value === threshold;
    }
};

export const matchesComparison = (
    stats: ComparableStats,
    comparison: ComparisonSnapshot | null,
): boolean => {
    if (!comparison) return true;

    if (comparison.costComparison !== null && comparison.cost !== null) {
        if (!compareValue(stats.cost, comparison.costComparison, comparison.cost)) return false;
    }
    if (comparison.attackComparison !== null && comparison.attack !== null) {
        if (!compareValue(stats.attack, comparison.attackComparison, comparison.attack))
            return false;
    }
    if (comparison.healthComparison !== null && comparison.health !== null) {
        if (!compareValue(stats.health, comparison.healthComparison, comparison.health))
            return false;
    }

    return true;
};

export const getBoardMinionStats = (minion: MinionState): ComparableStats => ({
    cost: minion.originalCard.cost,
    attack: minion.attack,
    health: minion.health,
});

export const resolveRelativeComparison = (
    comparison: ComparisonSnapshot | null,
    sourceStats: ComparableStats,
): ComparisonSnapshot | null => {
    if (!comparison) return null;

    return {
        costComparison: comparison.costComparison,
        cost:
            comparison.costComparison !== null && comparison.cost !== null
                ? sourceStats.cost + comparison.cost
                : null,
        attackComparison: comparison.attackComparison,
        attack:
            comparison.attackComparison !== null && comparison.attack !== null
                ? sourceStats.attack + comparison.attack
                : null,
        healthComparison: comparison.healthComparison,
        health:
            comparison.healthComparison !== null && comparison.health !== null
                ? sourceStats.health + comparison.health
                : null,
    };
};

export const getDeckCardStats = (card: PlayerCard): ComparableStats => {
    if (card.type === "MINION") {
        return { cost: card.cost, attack: card.attack, health: card.health };
    }

    return { cost: card.cost, attack: 0, health: 0 };
};
