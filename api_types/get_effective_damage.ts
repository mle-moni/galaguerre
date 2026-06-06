import type { CardActionSnapshot } from "./game.types.js";

export const getEffectiveDamage = (action: CardActionSnapshot, spellPower = 0): number => {
    return (action.damage ?? 0) + spellPower;
};

export const getDisplayedDamage = (
    action: CardActionSnapshot,
    spellPower?: number,
): number | null => {
    if (action.damage === null || action.damage <= 0) return null;
    if (spellPower === undefined) return action.damage;

    return getEffectiveDamage(action, spellPower);
};
