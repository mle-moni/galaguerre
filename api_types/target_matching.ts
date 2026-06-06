import type {
    ActionTarget,
    BoardState,
    CardActionSnapshot,
    ComparisonOperator,
    ComparisonSnapshot,
    MinionCard,
    MinionState,
    TargetSnapshot,
} from "./game.types.js";

const compareValue = (value: number, operator: ComparisonOperator, target: number): boolean => {
    switch (operator) {
        case "<":
            return value < target;
        case ">":
            return value > target;
        case "=":
            return value === target;
    }
};

export const matchesComparison = (
    stats: { cost: number; attack: number; health: number },
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

export const heroMatchesTarget = (target: TargetSnapshot, isOpponentHero: boolean): boolean => {
    if (target.type !== "HERO") return false;

    const targetIsOpponent = target.targetTeam === "OPPONENT";
    return targetIsOpponent === isOpponentHero;
};

export const minionMatchesTarget = (
    minion: MinionState,
    target: TargetSnapshot,
    isOpponentMinion: boolean,
): boolean => {
    if (target.type !== "MINION") return false;

    const targetIsOpponent = target.targetTeam === "OPPONENT";
    if (targetIsOpponent !== isOpponentMinion) return false;

    const card = minion.originalCard;
    if (card.type !== "MINION") return false;

    if (
        !matchesComparison(
            { cost: card.cost, attack: card.attack, health: card.health },
            target.comparison,
        )
    ) {
        return false;
    }

    if (target.tagId !== null && !card.tagIds.includes(target.tagId)) {
        return false;
    }

    return true;
};

export const actionRequiresTarget = (card: MinionCard): boolean => {
    return card.battlecryActions?.some((action) => action.isTargeted) ?? false;
};

export const selectedTargetMatchesAction = (
    selectedTarget: ActionTarget,
    action: CardActionSnapshot,
    playerBoard: BoardState,
    opponentBoard: BoardState,
): boolean => {
    if (!action.isTargeted || !action.target) return false;

    const isOpponent = selectedTarget.owner === "OPPONENT";

    if (selectedTarget.spotId === null) {
        return heroMatchesTarget(action.target, isOpponent);
    }

    const board = isOpponent ? opponentBoard : playerBoard;
    const minion = board[selectedTarget.spotId];
    if (!minion) return false;

    return minionMatchesTarget(minion, action.target, isOpponent);
};
