import { getMinionPowerEffects } from "./get_minion_power_effects.js";
import type { MinionCard } from "./game.types.js";

const MINION_EFFECT_LINE_NAMES = [
    "Provocation",
    "Charge",
    "Furie des vents",
    "Toxique",
    "Discrétion",
    "Immunité",
] as const;

const getEffectNameFromLine = (line: string): string | null => {
    for (const name of MINION_EFFECT_LINE_NAMES) {
        if (line === name || line.startsWith(`${name} : `)) return name;
    }
    return null;
};

export const getActiveMinionEffectNames = (card: MinionCard): string[] => {
    return card.effects?.length ? card.effects : getMinionPowerEffects(card.minionPowers);
};

export const isMinionDescriptionLineDisabled = (
    line: string,
    activeEffects: string[],
    isSilenced = false,
): boolean => {
    const effectName = getEffectNameFromLine(line);
    if (effectName !== null) {
        return !activeEffects.includes(effectName);
    }

    return isSilenced && effectName === null;
};
