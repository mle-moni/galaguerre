import type { CardActionSnapshot } from "#api_types/game.types";
import { formatActionDescription } from "./action_engine/format_action_description.js";
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

export const getBattlecryDescription = (actions: CardActionSnapshot[]): string[] => {
    return actions
        .map((action) => formatActionDescription(action))
        .filter((description): description is string => description !== null);
};

export const getMinionCardDescription = (
    attack: number,
    health: number,
    effects: string[],
    battlecryLines: string[] = [],
): string => {
    const base = `Serviteur ${attack}/${health}.`;
    const parts: string[] = [base];

    if (effects.length > 0) {
        const details = effects.map((effect) => EFFECT_DESCRIPTIONS[effect] ?? effect).join(" ");
        parts.push(details);
    }

    if (battlecryLines.length > 0) {
        parts.push(battlecryLines.join(" "));
    }

    return parts.join(" ");
};
