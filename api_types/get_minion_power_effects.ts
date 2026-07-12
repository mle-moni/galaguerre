import type { MinionPowerSnapshot } from "./game.types.js";

export const getMinionPowerEffects = (power: MinionPowerSnapshot | null | undefined): string[] => {
    if (!power) return [];

    const effects: string[] = [];
    if (power.hasTaunt) effects.push("Provocation");
    if (power.hasCharge) effects.push("Charge");
    if (power.hasRush) effects.push("Ruée");
    if (power.hasWindfury) effects.push("Furie des vents");
    if (power.isPoisonous) effects.push("Toxique");
    if (power.hasStealth) effects.push("Discrétion");
    if (power.hasDivineShield) effects.push("Immunité");
    return effects;
};
