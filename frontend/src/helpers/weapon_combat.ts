import type { GamePlayer, WeaponState } from "#api_types/game.types";

export const getHeroAttacksThisRound = (player: GamePlayer, currentRound: number): number => {
    if (player.heroLastAttackAtRound !== currentRound) return 0;
    return player.heroAttacksThisRound ?? 1;
};

export const canWeaponAttack = (
    player: GamePlayer,
    weaponState: WeaponState | null,
    currentRound: number,
): boolean => {
    if (!weaponState) return false;
    return getHeroAttacksThisRound(player, currentRound) < 1;
};
