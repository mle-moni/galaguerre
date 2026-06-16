import type { CardActionSnapshot, DynamicCostSnapshot, PassiveSnapshot } from "./game.types.js";
import type { GalaguerreDynamicCostSource } from "../app/galaguerre/galaguerre.types.js";
import {
    formatActionDescription,
    formatHealDamagePassiveTriggerLabel,
    formatPlayCardPassiveTriggerLabel,
    formatSummonPassiveTriggerLabel,
} from "./format_action_description.js";

const PASSIVE_TRIGGER_LABELS: Record<
    Exclude<NonNullable<PassiveSnapshot["triggersOn"]>, "HEAL" | "DAMAGE" | "PLAY_CARD" | "SUMMON">,
    string
> = {
    TURN_END: "fin de tour",
    TURN_BEGIN: "début de tour",
    DRAW: "pioche",
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
                const triggerLabel =
                    passive.triggersOn === "PLAY_CARD"
                        ? formatPlayCardPassiveTriggerLabel(passive.playCardFilter)
                        : passive.triggersOn === "SUMMON"
                          ? formatSummonPassiveTriggerLabel(passive.summonFilter)
                          : passive.triggersOn === "HEAL" || passive.triggersOn === "DAMAGE"
                            ? formatHealDamagePassiveTriggerLabel(
                                  passive.triggersOn,
                                  passive.triggerTargetFilter ?? null,
                              )
                            : PASSIVE_TRIGGER_LABELS[passive.triggersOn];
                return formatActionDescription(passive.action, `Passif (${triggerLabel})`);
            }

            if (passive.type === "BOOST" && passive.passiveBoost) {
                const actionLike: CardActionSnapshot = {
                    type: "BOOST",
                    isTargeted: false,
                    boost: passive.passiveBoost.boost,
                    target: passive.passiveBoost.target,
                    onTargetResult: null,
                    actionCondition: null,
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

const DYNAMIC_COST_REDUCTION_LABELS: Record<
    GalaguerreDynamicCostSource,
    (amountPer: number) => string
> = {
    HAND_CARD_COUNT: (amountPer) => `Coût réduit de ${amountPer} pour chaque carte en main.`,
    BOARD_MINION_COUNT: (amountPer) =>
        `Coût réduit de ${amountPer} pour chaque serviteur sur le plateau.`,
    HERO_MISSING_HEALTH: (amountPer) =>
        `Coût réduit de ${amountPer} pour chaque point de vie manquant au héros.`,
};

export const getDynamicCostDescription = (dynamicCost: DynamicCostSnapshot | null): string[] => {
    if (!dynamicCost) return [];

    return dynamicCost.reductions.map(({ source, amountPer }) =>
        DYNAMIC_COST_REDUCTION_LABELS[source](amountPer),
    );
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
    dynamicCost: DynamicCostSnapshot | null = null,
): string => {
    const parts: string[] = [
        `Serviteur ${attack}/${health}.`,
        ...getDynamicCostDescription(dynamicCost),
        ...effects.map(formatEffectLine),
        ...passiveLines,
        ...battlecryLines,
        ...deathrattleLines,
    ];

    return parts.join("\n");
};
