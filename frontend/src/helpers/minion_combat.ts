import type { MinionState } from "#api_types/game.types";

export const getMinionHasCharge = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.hasCharge ?? false;
};

export const canMinionAttack = (minion: MinionState, currentRound: number): boolean => {
    if (minion.lastActionAtRound === currentRound) return false;
    if (minion.placedAtRound === currentRound && !getMinionHasCharge(minion)) return false;
    return true;
};
