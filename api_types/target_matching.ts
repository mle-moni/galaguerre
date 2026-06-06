import type {
    ActionTarget,
    BoardState,
    CardActionSnapshot,
    MinionCard,
    MinionState,
    SpellCard,
    TargetSnapshot,
} from "./game.types.js";
import { getBoardMinionStats, matchesComparison } from "./comparison_matching.js";

export { matchesComparison } from "./comparison_matching.js";

export const heroMatchesTarget = (target: TargetSnapshot, isOpponentHero: boolean): boolean => {
    if (target.type !== "HERO") return false;

    if (target.targetTeam === "ALL") return true;

    const targetIsOpponent = target.targetTeam === "OPPONENT";
    return targetIsOpponent === isOpponentHero;
};

export const shouldExcludeSourceMinion = (
    target: TargetSnapshot,
    sourceMinion: MinionState | undefined,
    candidateMinion: MinionState,
): boolean => {
    if (!sourceMinion || !target.excludeSelf) return false;
    return sourceMinion.uuid === candidateMinion.uuid;
};

export const minionMatchesTarget = (
    minion: MinionState,
    target: TargetSnapshot,
    isOpponentMinion: boolean,
): boolean => {
    if (target.type !== "MINION") return false;

    if (target.targetTeam !== "ALL") {
        const targetIsOpponent = target.targetTeam === "OPPONENT";
        if (targetIsOpponent !== isOpponentMinion) return false;
    }

    const card = minion.originalCard;
    if (card.type !== "MINION") return false;

    if (!matchesComparison(getBoardMinionStats(minion), target.comparison)) {
        return false;
    }

    if (target.tagId !== null && !card.tagIds.includes(target.tagId)) {
        return false;
    }

    return true;
};

export const actionRequiresTarget = (card: MinionCard | SpellCard): boolean => {
    if (card.type === "SPELL") return card.action.isTargeted;
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
