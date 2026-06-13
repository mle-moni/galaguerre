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
        if (line.startsWith(`${name} : `)) return name;
    }
    return null;
};

export const getActiveMinionEffectNames = (card: MinionCard): string[] => {
    return card.effects?.length ? card.effects : getMinionPowerEffects(card.minionPowers);
};

export const isMinionDescriptionLineDisabled = (
    line: string,
    lineIndex: number,
    activeEffects: string[],
    isSilenced = false,
): boolean => {
    if (isSilenced && lineIndex > 0) return true;

    const effectName = getEffectNameFromLine(line);
    return effectName !== null && !activeEffects.includes(effectName);
};
