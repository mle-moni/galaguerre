import type { MinionState } from "#api_types/game.types";

export const getMinionHasCharge = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.hasCharge ?? false;
};

export const getMinionHasWindfury = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.hasWindfury ?? false;
};

export const getMinionMaxAttacks = (minion: MinionState): number => {
    return getMinionHasWindfury(minion) ? 2 : 1;
};

export const getMinionAttacksThisRound = (minion: MinionState, currentRound: number): number => {
    if (minion.lastActionAtRound !== currentRound) return 0;
    return minion.attacksThisRound ?? 1;
};

export const canMinionAttack = (minion: MinionState, currentRound: number): boolean => {
    if (getMinionAttacksThisRound(minion, currentRound) >= getMinionMaxAttacks(minion))
        return false;
    if (minion.placedAtRound === currentRound && !getMinionHasCharge(minion)) return false;
    return true;
};
