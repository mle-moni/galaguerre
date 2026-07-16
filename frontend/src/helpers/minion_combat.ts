import type { MinionCard, MinionState } from "#api_types/game.types";

export const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasTaunt ?? false;
};

export const getMinionHasCharge = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasCharge ?? false;
};

export const getMinionHasRush = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasRush ?? false;
};

export const getMinionHasWindfury = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasWindfury ?? false;
};

export const getMinionMaxAttacks = (minion: MinionState): number => {
    return getMinionHasWindfury(minion) ? 2 : 1;
};

export const getMinionAttacksThisRound = (minion: MinionState, currentRound: number): number => {
    if (minion.lastActionAtRound !== currentRound) return 0;
    return minion.attacksThisRound ?? 1;
};

export const canMinionAttack = (minion: MinionState, currentRound: number): boolean => {
    if (minion.attack <= 0) return false;
    if (getMinionAttacksThisRound(minion, currentRound) >= getMinionMaxAttacks(minion))
        return false;
    if (
        minion.placedAtRound === currentRound &&
        !getMinionHasCharge(minion) &&
        !getMinionHasRush(minion)
    )
        return false;
    return true;
};

export const canMinionAttackHero = (minion: MinionState, currentRound: number): boolean => {
    if (!canMinionAttack(minion, currentRound)) return false;
    if (
        minion.placedAtRound === currentRound &&
        getMinionHasRush(minion) &&
        !getMinionHasCharge(minion)
    )
        return false;
    return true;
};

export type MinionAttackStatus = "ready" | "sleeping" | "exhausted" | "idle";

export const getMinionAttackStatus = (
    minion: MinionState,
    currentRound: number,
    isMyTurn: boolean,
): MinionAttackStatus => {
    if (!isMyTurn) return "idle";
    if (minion.attack <= 0) return "idle";
    if (canMinionAttack(minion, currentRound)) return "ready";
    if (
        minion.placedAtRound === currentRound &&
        !getMinionHasCharge(minion) &&
        !getMinionHasRush(minion)
    )
        return "sleeping";
    return "exhausted";
};

export const getMinionRemainingAttacks = (minion: MinionState, currentRound: number): number => {
    return Math.max(
        0,
        getMinionMaxAttacks(minion) - getMinionAttacksThisRound(minion, currentRound),
    );
};

export const getMinionCardMaxAttacks = (card: MinionCard): number => {
    return card.minionPowers?.hasWindfury ? 2 : 1;
};

export const getMinionAttackStatusLabel = (
    status: MinionAttackStatus,
    maxAttacks: number,
): string | undefined => {
    switch (status) {
        case "ready":
            return "Peut attaquer";
        case "sleeping":
            return "Sommeil — joué ce tour";
        case "exhausted":
            if (maxAttacks > 1) return `A utilisé ses ${maxAttacks} attaques`;
            return "A déjà attaqué ce tour";
        default:
            return undefined;
    }
};
