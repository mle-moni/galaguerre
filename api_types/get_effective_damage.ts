import type { CardActionFieldsSnapshot } from "./game.types.js";

export const getEffectiveDamage = (action: CardActionFieldsSnapshot, spellPower = 0): number => {
    if (action.type !== "DAMAGE") return spellPower;
    return action.damage + spellPower;
};

export const getDisplayedDamage = (
    action: CardActionFieldsSnapshot,
    spellPower?: number,
): number | null => {
    if (action.type !== "DAMAGE" || action.damage <= 0) return null;
    if (spellPower === undefined) return action.damage;

    return getEffectiveDamage(action, spellPower);
};
