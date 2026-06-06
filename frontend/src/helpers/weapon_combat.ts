import type { WeaponState } from "#api_types/game.types";

export const getWeaponAttacksThisRound = (
    weaponState: WeaponState,
    currentRound: number,
): number => {
    if (weaponState.lastActionAtRound !== currentRound) return 0;
    return weaponState.attacksThisRound ?? 1;
};

export const canWeaponAttack = (weaponState: WeaponState, currentRound: number): boolean => {
    return getWeaponAttacksThisRound(weaponState, currentRound) < 1;
};
