import type {
    CardActionSnapshot,
    DynamicCostSnapshot,
    MinionCard,
    PassiveBoostSnapshot,
    PassiveSnapshot,
} from "./game.types.js";
import { getMinionPowerEffects } from "./get_minion_power_effects.js";
import type { GalaguerreDynamicCostSource } from "../app/galaguerre/galaguerre.types.js";
import { EFFECT_DESCRIPTIONS } from "./card_keyword_glossary.js";
import { CARD_TAG_LABELS, isCardTagImageSymbol } from "./card.types.js";
import {
    formatActionDescription,
    formatGroupedActionDescriptions,
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

const LABEL_ONLY_EFFECTS = new Set(["Provocation", "Discrétion"]);

export const getBattlecryDescription = (actions: CardActionSnapshot[]): string[] => {
    return formatGroupedActionDescriptions(actions, "Cri de guerre");
};

export const getDeathrattleDescription = (actions: CardActionSnapshot[]): string[] => {
    return formatGroupedActionDescriptions(actions, "Dernier souffle");
};

export const getSpellEffectDescription = (actions: CardActionSnapshot[]): string[] => {
    return formatGroupedActionDescriptions(actions, "Effet");
};

export const CAST_WHEN_DRAWN_LABEL = "Lancé quand pioché";

export const joinCardDescriptionParts = (parts: string[]): string => {
    const normalized = parts
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => part.replace(/\.$/, ""));

    if (normalized.length === 0) return "";
    return `${normalized.join(". ")}.`;
};

export const getSpellCardDescription = (effectLines: string[], castsWhenDrawn = false): string => {
    const parts = castsWhenDrawn ? [CAST_WHEN_DRAWN_LABEL, ...effectLines] : effectLines;
    return joinCardDescriptionParts(parts);
};

const formatTagChip = (tag: NonNullable<PassiveBoostSnapshot["target"]>["tag"]): string => {
    if (!tag) return "";
    const meta = CARD_TAG_LABELS[tag];
    const prefix = isCardTagImageSymbol(meta.symbol) ? "" : `${meta.symbol} `;
    return `${prefix}${meta.label}`;
};

const formatScaledPassiveBoostDescription = (passiveBoost: PassiveBoostSnapshot): string => {
    const { boost, target } = passiveBoost;
    const parts: string[] = [];

    if (boost.attack !== null && boost.health !== null) {
        parts.push(`+${boost.attack}/+${boost.health}`);
    } else {
        if (boost.attack !== null) parts.push(`+${boost.attack} attaque`);
        if (boost.health !== null) parts.push(`+${boost.health} PV`);
    }

    if (boost.spellPower !== null) {
        parts.push(`+${boost.spellPower} dégâts de sort`);
    }

    const tagPart = target?.tag ? ` ${formatTagChip(target.tag)}` : "";
    return `Passif : Gagne ${parts.join(", ")} pour chaque autre serviteur${tagPart} sur le plateau.`;
};

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
                if (passive.passiveBoost.scaleToSource === true) {
                    return formatScaledPassiveBoostDescription(passive.passiveBoost);
                }

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
    if (LABEL_ONLY_EFFECTS.has(effect)) return effect;
    const description = EFFECT_DESCRIPTIONS[effect] ?? effect;
    return `${effect} : ${description}`;
};

const DYNAMIC_COST_REDUCTION_LABELS: Record<
    GalaguerreDynamicCostSource,
    (amountPer: number) => string
> = {
    HAND_CARD_COUNT: (amountPer) => `Coût réduit de ${amountPer} pour chaque carte en main.`,
    BOARD_MINION_COUNT: (amountPer) =>
        `Coût réduit de ${amountPer} pour chaque monstre sur le plateau.`,
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
    return joinCardDescriptionParts([`Arme ${damage}/${durability}.`, ...deathrattleLines]);
};

export const buildMinionCardDescriptionParts = (
    attack: number,
    health: number,
    effects: string[],
    battlecryLines: string[] = [],
    deathrattleLines: string[] = [],
    passiveLines: string[] = [],
    dynamicCost: DynamicCostSnapshot | null = null,
): string[] => {
    return [
        `Monstre ${attack}/${health}.`,
        ...getDynamicCostDescription(dynamicCost),
        ...effects.map(formatEffectLine),
        ...passiveLines,
        ...battlecryLines,
        ...deathrattleLines,
    ];
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
    return joinCardDescriptionParts(
        buildMinionCardDescriptionParts(
            attack,
            health,
            effects,
            battlecryLines,
            deathrattleLines,
            passiveLines,
            dynamicCost,
        ),
    );
};

export const getMinionDescriptionPartsFromCard = (card: MinionCard): string[] => {
    return buildMinionCardDescriptionParts(
        card.attack,
        card.health,
        card.effects?.length ? card.effects : getMinionPowerEffects(card.minionPowers),
        getBattlecryDescription(card.battlecryActions),
        getDeathrattleDescription(card.deathrattleActions),
        getPassiveDescription(card.passives),
        card.dynamicCost,
    );
};
