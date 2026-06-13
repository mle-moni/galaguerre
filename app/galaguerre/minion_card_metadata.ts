import type {
    CardActionSnapshot,
    MinionPowerSnapshot,
    PassiveSnapshot,
} from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import { formatActionDescription } from "./action_engine/format_action_description.js";

export { getMinionPowerEffects };

const PASSIVE_TRIGGER_LABELS: Record<NonNullable<PassiveSnapshot["triggersOn"]>, string> = {
    TURN_END: "fin de tour",
    TURN_BEGIN: "début de tour",
    DRAW: "pioche",
    HEAL: "soin",
    PLAY_CARD: "carte jouée",
};

const EFFECT_DESCRIPTIONS: Record<string, string> = {
    Provocation: "Les adversaires doivent attaquer ce serviteur avant les autres cibles.",
    Charge: "Peut attaquer dès le tour où il est joué.",
    "Furie des vents": "Peut attaquer deux fois par tour.",
    Toxique: "Détruit tout serviteur blessé par ce serviteur.",
    Discrétion:
        "Ne peut être ciblé par les attaques ou sorts adverses tant qu'il n'a pas attaqué. Reste vulnérable aux effets de zone.",
    Immunité: "Bloque la première source de dégâts reçue.",
};

export const normalizeMinionPowers = (
    power: MinionPowerSnapshot | null | undefined,
): MinionPowerSnapshot => ({
    hasTaunt: power?.hasTaunt ?? false,
    hasCharge: power?.hasCharge ?? false,
    hasWindfury: power?.hasWindfury ?? false,
    isPoisonous: power?.isPoisonous ?? false,
    hasStealth: power?.hasStealth ?? false,
    hasDivineShield: power?.hasDivineShield ?? false,
});

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

export const getSpellEffectDescription = (actions: CardActionSnapshot[]): string[] => {
    return actions
        .map((action) => formatActionDescription(action, "Effet"))
        .filter((description): description is string => description !== null);
};

export const getSpellCardDescription = (effectLines: string[]): string => effectLines.join("\n");

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
                    onTargetResult: null,
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
