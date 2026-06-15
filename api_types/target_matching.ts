import type {
    ActionTarget,
    BoardState,
    CardActionSnapshot,
    GamePlayer,
    MinionCard,
    MinionSpotId,
    MinionState,
    SpellCard,
    TargetSnapshot,
} from "./game.types.js";
import { MINION_SPOT_IDS } from "./game.types.js";
import { getBoardMinionStats, matchesComparison } from "./comparison_matching.js";

export { matchesComparison } from "./comparison_matching.js";

export const hasRandomLimitedTarget = (target: TargetSnapshot | null | undefined): boolean => {
    return (
        target !== null &&
        target !== undefined &&
        target.maxTargets !== null &&
        target.maxTargets >= 1 &&
        target.targetSelectionMode === "RANDOM"
    );
};

export const heroMatchesTarget = (target: TargetSnapshot, isOpponentHero: boolean): boolean => {
    if (target.type !== "HERO" && target.type !== "ALL") return false;

    if (target.targetTeam === "ALL") return true;

    const targetIsOpponent = target.targetTeam === "OPPONENT";
    return targetIsOpponent === isOpponentHero;
};

export const getMinionHasStealth = (minion: MinionState): boolean =>
    minion.originalCard.type === "MINION" &&
    (minion.originalCard.minionPowers?.hasStealth ?? false);

export const canOpponentDirectlyTargetMinion = (minion: MinionState): boolean =>
    !getMinionHasStealth(minion);

export const shouldExcludeSourceMinion = (
    target: TargetSnapshot,
    sourceMinion: MinionState | undefined,
    candidateMinion: MinionState,
): boolean => {
    if (target.onlySelf) {
        if (!sourceMinion) return true;
        return sourceMinion.uuid !== candidateMinion.uuid;
    }

    if (!sourceMinion || !target.excludeSelf) return false;
    return sourceMinion.uuid === candidateMinion.uuid;
};

export const minionMatchesTarget = (
    minion: MinionState,
    target: TargetSnapshot,
    isOpponentMinion: boolean,
): boolean => {
    if (target.type !== "MINION" && target.type !== "ALL") return false;

    if (target.targetTeam !== "ALL") {
        const targetIsOpponent = target.targetTeam === "OPPONENT";
        if (targetIsOpponent !== isOpponentMinion) return false;
    }

    const card = minion.originalCard;
    if (card.type !== "MINION") return false;

    if (!matchesComparison(getBoardMinionStats(minion), target.comparison)) {
        return false;
    }

    if (target.tag !== null && !card.tags.includes(target.tag)) {
        return false;
    }

    return true;
};

export type PassiveTriggerEvent =
    | { type: "HERO"; affectedPlayer: GamePlayer }
    | { type: "MINION"; owner: GamePlayer; spotId: MinionSpotId; minion: MinionState };

export type PassiveTriggerGameContext = {
    playerOne: GamePlayer;
    playerTwo: GamePlayer;
};

const getOpponentPlayer = (context: PassiveTriggerGameContext, player: GamePlayer): GamePlayer =>
    player === context.playerOne ? context.playerTwo : context.playerOne;

export const passiveTriggerEventMatchesFilter = (
    event: PassiveTriggerEvent,
    filter: TargetSnapshot | null,
    passiveOwner: GamePlayer,
    gameContext: PassiveTriggerGameContext,
    sourceMinion: MinionState,
): boolean => {
    if (filter === null) return true;

    const passiveOpponent = getOpponentPlayer(gameContext, passiveOwner);

    if (event.type === "HERO") {
        if (filter.type === "MINION") return false;
        const isOpponentHero = event.affectedPlayer === passiveOpponent;
        return heroMatchesTarget(filter, isOpponentHero);
    }

    if (filter.type === "HERO") return false;

    const isOpponentMinion = event.owner === passiveOpponent;
    if (shouldExcludeSourceMinion(filter, sourceMinion, event.minion)) return false;
    return minionMatchesTarget(event.minion, filter, isOpponentMinion);
};

export const actionRequiresTarget = (card: MinionCard | SpellCard): boolean => {
    if (card.type === "SPELL") return card.spellActions.some((action) => action.isTargeted);
    return card.battlecryActions?.some((action) => action.isTargeted) ?? false;
};

const actionRequiresMindControlBoardSpace = (action: CardActionSnapshot): boolean => {
    return action.type === "MIND_CONTROL" && action.isTargeted;
};

const getCardActions = (card: MinionCard | SpellCard): CardActionSnapshot[] => {
    if (card.type === "SPELL") return card.spellActions;
    return card.battlecryActions ?? [];
};

export const cardHasPlayableTarget = (
    card: MinionCard | SpellCard,
    playerBoard: BoardState,
    opponentBoard: BoardState,
    playerHasSpace = true,
): boolean => {
    const targetedActions = getCardActions(card).filter((action) => action.isTargeted);
    if (targetedActions.length === 0) return true;

    const requiresMindControlSpace = targetedActions.some(actionRequiresMindControlBoardSpace);
    if (requiresMindControlSpace && !playerHasSpace) return false;

    for (const isOpponent of [true, false] as const) {
        const heroValid = targetedActions.every((action) => {
            if (!action.target) return false;
            return heroMatchesTarget(action.target, isOpponent);
        });

        if (heroValid) return true;
    }

    for (const isOpponent of [true, false] as const) {
        const board = isOpponent ? opponentBoard : playerBoard;

        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;

            const minionValid = targetedActions.every((action) => {
                if (!action.target) return false;
                if (!minionMatchesTarget(minion, action.target, isOpponent)) return false;
                if (isOpponent && !canOpponentDirectlyTargetMinion(minion)) return false;
                return true;
            });

            if (minionValid) return true;
        }
    }

    return false;
};

export const selectedTargetMatchesAction = (
    selectedTarget: ActionTarget,
    action: CardActionSnapshot,
    playerBoard: BoardState,
    opponentBoard: BoardState,
    playerHasSpace = true,
): boolean => {
    if (!action.isTargeted || !action.target) return false;

    if (actionRequiresMindControlBoardSpace(action) && !playerHasSpace) return false;

    const isOpponent = selectedTarget.owner === "OPPONENT";

    if (selectedTarget.spotId === null) {
        return heroMatchesTarget(action.target, isOpponent);
    }

    const board = isOpponent ? opponentBoard : playerBoard;
    const minion = board[selectedTarget.spotId];
    if (!minion) return false;

    if (!minionMatchesTarget(minion, action.target, isOpponent)) return false;

    if (isOpponent && !canOpponentDirectlyTargetMinion(minion)) return false;

    return true;
};
