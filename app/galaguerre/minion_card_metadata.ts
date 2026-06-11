import type { CardActionSnapshot, PassiveSnapshot } from "#api_types/game.types";
import type { MinionCardData } from "#galaguerre/card_definition.schema";
import { formatActionDescription } from "./action_engine/format_action_description.js";

const PASSIVE_TRIGGER_LABELS: Record<NonNullable<PassiveSnapshot["triggersOn"]>, string> = {
    TURN_END: "fin de tour",
    TURN_BEGIN: "début de tour",
    DRAW: "pioche",
    HEAL: "soin",
};

const EFFECT_DESCRIPTIONS: Record<string, string> = {
    Provocation: "Les adversaires doivent attaquer ce serviteur avant les autres cibles.",
    Charge: "Peut attaquer dès le tour où il est joué.",
    "Furie des vents": "Peut attaquer deux fois par tour.",
    Toxique: "Détruit tout serviteur blessé par ce serviteur.",
};

export const getMinionPowerEffects = (
    power:
        | Pick<MinionCardData, "hasTaunt" | "hasCharge" | "hasWindfury" | "isPoisonous">
        | null
        | undefined,
): string[] => {
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
        .map((action) => formatActionDescription(action, "Cri de guerre"))
        .filter((description): description is string => description !== null);
};

export const getDeathrattleDescription = (actions: CardActionSnapshot[]): string[] => {
    return actions
        .map((action) => formatActionDescription(action, "Dernier souffle"))
        .filter((description): description is string => description !== null);
};

export const getPassiveDescription = (passives: PassiveSnapshot[]): string[] => {
    return passives
        .map((passive) => {
            if (passive.type === "ACTION" && passive.action && passive.triggersOn) {
                const triggerLabel = PASSIVE_TRIGGER_LABELS[passive.triggersOn];
                return formatActionDescription(passive.action, `Passif (${triggerLabel})`);
            }

            if (passive.type === "BOOST" && passive.passiveBoost) {
                const actionLike: CardActionSnapshot = {
                    type: "BOOST",
                    isTargeted: false,
                    damage: null,
                    heal: null,
                    drawCount: null,
                    enemyDrawCount: null,
                    drawCardFilter: null,
                    enemyDrawCardFilter: null,
                    boost: passive.passiveBoost.boost,
                    target: passive.passiveBoost.target,
                };
                return formatActionDescription(actionLike, "Passif");
            }

            return null;
        })
        .filter((description): description is string => description !== null);
};

const formatEffectLine = (effect: string): string => {
    const description = EFFECT_DESCRIPTIONS[effect] ?? effect;
    return `${effect} : ${description}`;
};

export const getWeaponCardDescription = (
    damage: number,
    durability: number,
    deathrattleLines: string[] = [],
): string => {
    const parts: string[] = [`Arme ${damage}/${durability}.`, ...deathrattleLines];

    return parts.join("\n");
};

export const getMinionCardDescription = (
    attack: number,
    health: number,
    effects: string[],
    battlecryLines: string[] = [],
    deathrattleLines: string[] = [],
    passiveLines: string[] = [],
): string => {
    const parts: string[] = [
        `Serviteur ${attack}/${health}.`,
        ...effects.map(formatEffectLine),
        ...passiveLines,
        ...battlecryLines,
        ...deathrattleLines,
    ];

    return parts.join("\n");
};
