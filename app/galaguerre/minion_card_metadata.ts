import type MinionPower from "#models/minion_power";

const EFFECT_DESCRIPTIONS: Record<string, string> = {
    Provocation: "Les adversaires doivent attaquer ce serviteur avant les autres cibles.",
    Charge: "Peut attaquer dès le tour où il est joué.",
    "Furie des vents": "Peut attaquer deux fois par tour.",
    Toxique: "Détruit tout serviteur blessé par ce serviteur.",
};

export const getMinionPowerEffects = (power: MinionPower | null | undefined): string[] => {
    if (!power) return [];

    const effects: string[] = [];
    if (power.hasTaunt) effects.push("Provocation");
    if (power.hasCharge) effects.push("Charge");
    if (power.hasWindfury) effects.push("Furie des vents");
    if (power.isPoisonous) effects.push("Toxique");
    return effects;
};

export const getMinionCardDescription = (
    attack: number,
    health: number,
    effects: string[],
): string => {
    const base = `Serviteur ${attack}/${health}.`;
    if (effects.length === 0) return base;

    const details = effects.map((effect) => EFFECT_DESCRIPTIONS[effect] ?? effect).join(" ");
    return `${base} ${details}`;
};
