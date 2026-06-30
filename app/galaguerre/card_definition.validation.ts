import type { z } from "zod";
import {
    boostHasEffect,
    boostHasMinionStats,
    boostHasSpellPower,
} from "./action_engine/boost_utils.js";
import { V1_ACTION_TYPES } from "./action_engine/v1_action_types.js";
import { GALAGUERRE_TARGET_SELECTION_MODES } from "./galaguerre.types.js";
import type { CardTag } from "./card_tags.js";
import type { MinionPower } from "./card_definition.schema.ts";
import type { CardActionDefinition } from "./card_definition.schema.ts";

export type ActionConditionDefinition = {
    opponentMinionCountMin: number | null;
};

export type ComparisonDefinition = {
    costComparison: "<" | ">" | "=" | null;
    cost: number | null;
    attackComparison: "<" | ">" | "=" | null;
    attack: number | null;
    healthComparison: "<" | ">" | "=" | null;
    health: number | null;
};

export type TargetDefinition = {
    type: "HERO" | "MINION" | "ALL";
    targetTeam: "PLAYER" | "OPPONENT" | "ALL";
    comparison: ComparisonDefinition | null;
    tag: CardTag | null;
    excludeSelf: boolean;
    onlySelf: boolean;
    maxTargets: number | null;
    targetSelectionMode: "RANDOM" | null;
};

export type BoostDefinition = {
    attack: number | null;
    health: number | null;
    spellPower: number | null;
    minionPowers: MinionPower | null;
};

export type CardFilterDefinition = {
    type: "MINION" | "SPELL" | "WEAPON";
    comparison: ComparisonDefinition | null;
    tags: CardTag[];
};

export type ReconvertParametersDefinition = CardFilterDefinition & {
    cardId: number | null;
    relativeToSource: boolean;
};

export type { OnTargetResultDefinition } from "./card_definition.schema.ts";

export type PassiveDefinition = {
    type: "ACTION" | "BOOST";
    triggersOn:
        | "TURN_END"
        | "TURN_BEGIN"
        | "DRAW"
        | "HEAL"
        | "DAMAGE"
        | "PLAY_CARD"
        | "SUMMON"
        | null;
    action: CardActionDefinition | null;
    passiveBoost: { boost: BoostDefinition; target: TargetDefinition | null } | null;
    playCardFilter: CardFilterDefinition | null;
    summonFilter: CardFilterDefinition | null;
    triggerTargetFilter: TargetDefinition | null;
};

const TARGETED_ACTION_TYPES = [
    "DAMAGE",
    "HEAL",
    "BOOST",
    "SILENCE",
    "DESTROY",
    "BREAK_WEAPON",
    "RECONVERSION",
    "MIND_CONTROL",
] as const;

const validateComparisonSnapshot = (
    comparison: ComparisonDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    for (const field of ["cost", "attack", "health"] as const) {
        const operatorField = `${field}Comparison` as const;
        const operator = comparison[operatorField];
        const value = comparison[field];

        if (operator === null && value === null) continue;

        if (operator === null || value === null) {
            ctx.addIssue({
                code: "custom",
                message: `${field} comparison requires both operator and value`,
                path: [...path, field],
            });
        }
    }

    const hasActiveCriterion =
        (comparison.costComparison !== null && comparison.cost !== null) ||
        (comparison.attackComparison !== null && comparison.attack !== null) ||
        (comparison.healthComparison !== null && comparison.health !== null);

    if (!hasActiveCriterion) {
        ctx.addIssue({
            code: "custom",
            message: "comparison requires at least one active criterion",
            path,
        });
    }
};

const validateTargetExcludeSelf = (
    target: TargetDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (!target.excludeSelf) return;

    if (target.type !== "MINION" && target.type !== "ALL") {
        ctx.addIssue({
            code: "custom",
            message: "excludeSelf is only supported for MINION targets",
            path: [...path, "excludeSelf"],
        });
    }
};

const validateTargetOnlySelf = (
    target: TargetDefinition,
    isTargeted: boolean,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (!target.onlySelf) return;

    if (target.excludeSelf) {
        ctx.addIssue({
            code: "custom",
            message: "onlySelf and excludeSelf are mutually exclusive",
            path: [...path, "onlySelf"],
        });
    }

    if (target.type !== "MINION" && target.type !== "ALL") {
        ctx.addIssue({
            code: "custom",
            message: "onlySelf is only supported for MINION targets",
            path: [...path, "onlySelf"],
        });
    }

    if (isTargeted) {
        ctx.addIssue({
            code: "custom",
            message: "onlySelf is incompatible with isTargeted actions",
            path: [...path, "onlySelf"],
        });
    }

    if (target.maxTargets !== null || target.targetSelectionMode !== null) {
        ctx.addIssue({
            code: "custom",
            message: "onlySelf is incompatible with targetSelectionMode",
            path: [...path, "onlySelf"],
        });
    }
};

const validateTargetSelection = (
    target: TargetDefinition,
    isTargeted: boolean,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    const hasMaxTargets = target.maxTargets !== null;
    const hasSelectionMode = target.targetSelectionMode !== null;

    if (hasMaxTargets !== hasSelectionMode) {
        ctx.addIssue({
            code: "custom",
            message: "maxTargets and targetSelectionMode must both be set or both be null",
            path,
        });
    }

    if (!hasMaxTargets) return;

    if (target.maxTargets! < 1) {
        ctx.addIssue({
            code: "custom",
            message: "maxTargets must be >= 1",
            path: [...path, "maxTargets"],
        });
    }

    if (
        !GALAGUERRE_TARGET_SELECTION_MODES.includes(
            target.targetSelectionMode as (typeof GALAGUERRE_TARGET_SELECTION_MODES)[number],
        )
    ) {
        ctx.addIssue({
            code: "custom",
            message: `targetSelectionMode ${target.targetSelectionMode} is not supported`,
            path: [...path, "targetSelectionMode"],
        });
    }

    if (isTargeted) {
        ctx.addIssue({
            code: "custom",
            message: "targetSelectionMode is incompatible with isTargeted actions",
            path,
        });
    }
};

const validateTargetFilters = (
    target: TargetDefinition,
    isTargeted: boolean,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    validateTargetExcludeSelf(target, ctx, path);
    validateTargetOnlySelf(target, isTargeted, ctx, path);
    validateTargetSelection(target, isTargeted, ctx, path);

    if (target.comparison !== null || target.tag !== null) {
        if (target.type !== "MINION" && target.type !== "ALL") {
            ctx.addIssue({
                code: "custom",
                message: "comparison and tag filters require a MINION or ALL target type",
                path: [...path, "type"],
            });
        }
    }

    if (target.comparison !== null) {
        validateComparisonSnapshot(target.comparison, ctx, [...path, "comparison"]);
    }
};

const validateBoostContent = (
    boost: BoostDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (!boostHasEffect(boost)) {
        ctx.addIssue({
            code: "custom",
            message:
                "BOOST requires at least one non-null effect (attack, health, spellPower, or minionPower)",
            path,
        });
    }
};

const validateSilenceTarget = (
    target: TargetDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (target.type !== "MINION" && target.type !== "ALL") {
        ctx.addIssue({
            code: "custom",
            message: "SILENCE target must be MINION or ALL",
            path: [...path, "type"],
        });
    }
};

const validateDestroyTarget = (
    target: TargetDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (target.type !== "MINION" && target.type !== "ALL") {
        ctx.addIssue({
            code: "custom",
            message: "DESTROY target must be MINION or ALL",
            path: [...path, "type"],
        });
    }
};

const validateBreakWeaponTarget = (
    target: TargetDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (target.type !== "HERO") {
        ctx.addIssue({
            code: "custom",
            message: "BREAK_WEAPON target must be HERO",
            path: [...path, "type"],
        });
    }
};

const validateMindControlTarget = (
    target: TargetDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (target.type !== "MINION" && target.type !== "ALL") {
        ctx.addIssue({
            code: "custom",
            message: "MIND_CONTROL target must be MINION or ALL",
            path: [...path, "type"],
        });
    }
};

const validateSummonParameters = (
    parameters: ReconvertParametersDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (parameters.type !== "MINION") {
        ctx.addIssue({
            code: "custom",
            message: "SUMMON summonParameters.type must be MINION",
            path: [...path, "type"],
        });
    }

    if (parameters.cardId !== null && parameters.cardId <= 0) {
        ctx.addIssue({
            code: "custom",
            message: "SUMMON summonParameters.cardId must be > 0 when set",
            path: [...path, "cardId"],
        });
    }

    if (parameters.comparison !== null) {
        validateComparisonSnapshot(parameters.comparison, ctx, [...path, "comparison"]);
    }
};

const validateSummonPayload = (
    action: Extract<CardActionDefinition, { type: "SUMMON" }>,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    validateSummonParameters(action.summonParameters, ctx, [...path, "summonParameters"]);
};

const validateDeckCardPayload = (
    action: Extract<CardActionDefinition, { type: "DECK_CARD" }>,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (action.deckCardOperation === "ADD") {
        if (action.copyCount === null || action.copyCount <= 0) {
            ctx.addIssue({
                code: "custom",
                message: "DECK_CARD ADD action requires copyCount > 0",
                path: [...path, "copyCount"],
            });
        }
        if (action.deckPlacement === null) {
            ctx.addIssue({
                code: "custom",
                message: "DECK_CARD ADD action requires deckPlacement",
                path: [...path, "deckPlacement"],
            });
        }
        return;
    }

    if (action.copyCount !== null && action.copyCount <= 0) {
        ctx.addIssue({
            code: "custom",
            message: "DECK_CARD DELETE action requires copyCount > 0 when set",
            path: [...path, "copyCount"],
        });
    }

    if (action.copyCount === null && action.deckPlacement !== null) {
        ctx.addIssue({
            code: "custom",
            message: "DECK_CARD DELETE all copies must not set deckPlacement",
            path: [...path, "deckPlacement"],
        });
    }

    if (action.copyCount !== null && action.deckPlacement === null) {
        ctx.addIssue({
            code: "custom",
            message: "DECK_CARD DELETE with copyCount requires deckPlacement",
            path: [...path, "deckPlacement"],
        });
    }
};

const validateHandCardPayload = (
    action: Extract<CardActionDefinition, { type: "HAND_CARD" }>,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (action.copyCount <= 0) {
        ctx.addIssue({
            code: "custom",
            message: "HAND_CARD action requires copyCount > 0",
            path: [...path, "copyCount"],
        });
    }
};

const validateReconvertParameters = (
    parameters: ReconvertParametersDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (parameters.type !== "MINION") {
        ctx.addIssue({
            code: "custom",
            message: "RECONVERSION reconvertParameters.type must be MINION",
            path: [...path, "type"],
        });
    }

    if (parameters.cardId !== null && parameters.cardId <= 0) {
        ctx.addIssue({
            code: "custom",
            message: "RECONVERSION reconvertParameters.cardId must be > 0 when set",
            path: [...path, "cardId"],
        });
    }

    if (parameters.comparison !== null) {
        validateComparisonSnapshot(parameters.comparison, ctx, [...path, "comparison"]);
    }
};

const validateReconversionTarget = (
    target: TargetDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (target.type !== "MINION" && target.type !== "ALL") {
        ctx.addIssue({
            code: "custom",
            message: "RECONVERSION target must be MINION or ALL",
            path: [...path, "type"],
        });
    }
};

const validateReconversionPayload = (
    action: Extract<CardActionDefinition, { type: "RECONVERSION" }>,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    validateReconvertParameters(action.reconvertParameters, ctx, [...path, "reconvertParameters"]);
};

const validateBoostTargetCompatibility = (
    target: TargetDefinition,
    boost: BoostDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (target.type === "MINION") {
        if (boostHasSpellPower(boost) && !boostHasMinionStats(boost)) return;
        if (boostHasSpellPower(boost)) {
            ctx.addIssue({
                code: "custom",
                message: "BOOST spellPower cannot target MINION",
                path,
            });
        }
        return;
    }

    if (target.type === "HERO") {
        if (boostHasMinionStats(boost) && !boostHasSpellPower(boost)) return;
        if (boostHasMinionStats(boost)) {
            ctx.addIssue({
                code: "custom",
                message: "BOOST attack, health, and minionPower cannot target HERO",
                path,
            });
        }
    }
};

const validateOnTargetResult = (
    action: CardActionDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (action.onTargetResult == null) return;

    if (action.type !== "DAMAGE" || !action.isTargeted) {
        ctx.addIssue({
            code: "custom",
            message: "onTargetResult is only allowed on targeted DAMAGE actions",
            path: [...path, "onTargetResult"],
        });
        return;
    }

    const { when, healthComparison, action: followUpAction } = action.onTargetResult;

    if (when === "KILLED" && healthComparison !== null) {
        ctx.addIssue({
            code: "custom",
            message: "KILLED onTargetResult must not set healthComparison",
            path: [...path, "onTargetResult", "healthComparison"],
        });
    }

    if (when === "SURVIVED" && healthComparison !== null) {
        validateComparisonSnapshot(healthComparison, ctx, [
            ...path,
            "onTargetResult",
            "healthComparison",
        ]);
    }

    if ("isTargeted" in followUpAction && followUpAction.isTargeted) {
        ctx.addIssue({
            code: "custom",
            message: "onTargetResult follow-up action cannot be targeted",
            path: [...path, "onTargetResult", "action", "isTargeted"],
        });
    }

    validateNonTargetedAction({ ...followUpAction, onTargetResult: null }, ctx, [
        ...path,
        "onTargetResult",
        "action",
    ]);
};

const validateTargetedAction = (
    action: Extract<CardActionDefinition, { target: unknown }>,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (!TARGETED_ACTION_TYPES.includes(action.type as (typeof TARGETED_ACTION_TYPES)[number])) {
        ctx.addIssue({
            code: "custom",
            message: `Targeted action type ${action.type} is not supported`,
            path: [...path, "type"],
        });
        return;
    }

    if (!action.target) {
        ctx.addIssue({
            code: "custom",
            message: "Targeted action requires a HERO, MINION, or ALL target",
            path: [...path, "target"],
        });
        return;
    }

    validateTargetFilters(action.target, true, ctx, [...path, "target"]);

    switch (action.type) {
        case "DAMAGE":
            if (action.damage <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "DAMAGE action requires damage > 0",
                    path: [...path, "damage"],
                });
            }
            break;
        case "HEAL":
            if (action.heal <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "HEAL action requires heal > 0",
                    path: [...path, "heal"],
                });
            }
            break;
        case "BOOST":
            validateBoostContent(action.boost, ctx, [...path, "boost"]);
            validateBoostTargetCompatibility(action.target, action.boost, ctx, path);
            break;
        case "SILENCE":
            validateSilenceTarget(action.target, ctx, [...path, "target"]);
            break;
        case "DESTROY":
            validateDestroyTarget(action.target, ctx, [...path, "target"]);
            break;
        case "BREAK_WEAPON":
            validateBreakWeaponTarget(action.target, ctx, [...path, "target"]);
            break;
        case "RECONVERSION":
            validateReconversionPayload(action, ctx, path);
            validateReconversionTarget(action.target, ctx, [...path, "target"]);
            break;
        case "MIND_CONTROL":
            validateMindControlTarget(action.target, ctx, [...path, "target"]);
            break;
    }

    validateOnTargetResult(action, ctx, path);
};

const validateNonTargetedAction = (
    action: CardActionDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
    options: { allowTargeted?: boolean } = {},
) => {
    if ("isTargeted" in action && action.isTargeted) {
        if (options.allowTargeted) {
            validateTargetedAction(action, ctx, path);
        } else {
            ctx.addIssue({
                code: "custom",
                message: "Action cannot be targeted",
                path: [...path, "isTargeted"],
            });
        }
        return;
    }

    if (!V1_ACTION_TYPES.includes(action.type as (typeof V1_ACTION_TYPES)[number])) {
        ctx.addIssue({
            code: "custom",
            message: `Action type ${action.type} is not supported`,
            path: [...path, "type"],
        });
        return;
    }

    switch (action.type) {
        case "DAMAGE": {
            if (action.damage <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "DAMAGE action requires damage > 0",
                    path: [...path, "damage"],
                });
                return;
            }
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "DAMAGE action requires a HERO, MINION, or ALL target",
                    path: [...path, "target"],
                });
                return;
            }
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "HEAL": {
            if (action.heal <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "HEAL action requires heal > 0",
                    path: [...path, "heal"],
                });
                return;
            }
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "HEAL action requires a HERO, MINION, or ALL target",
                    path: [...path, "target"],
                });
                return;
            }
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "DRAW":
            if (action.drawCount <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "DRAW action requires drawCount > 0",
                    path: [...path, "drawCount"],
                });
            }
            break;
        case "ENEMY_DRAW":
            if (action.enemyDrawCount <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "ENEMY_DRAW action requires enemyDrawCount > 0",
                    path: [...path, "enemyDrawCount"],
                });
            }
            break;
        case "BOOST": {
            validateBoostContent(action.boost, ctx, [...path, "boost"]);
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "BOOST action requires a HERO, MINION, or ALL target",
                    path: [...path, "target"],
                });
                return;
            }
            validateBoostTargetCompatibility(action.target, action.boost, ctx, path);
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "SILENCE": {
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "SILENCE action requires a MINION or ALL target",
                    path: [...path, "target"],
                });
                return;
            }
            validateSilenceTarget(action.target, ctx, [...path, "target"]);
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "DESTROY": {
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "DESTROY action requires a MINION or ALL target",
                    path: [...path, "target"],
                });
                return;
            }
            validateDestroyTarget(action.target, ctx, [...path, "target"]);
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "BREAK_WEAPON": {
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "BREAK_WEAPON action requires a HERO target",
                    path: [...path, "target"],
                });
                return;
            }
            validateBreakWeaponTarget(action.target, ctx, [...path, "target"]);
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "RECONVERSION": {
            validateReconversionPayload(action, ctx, path);
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "RECONVERSION action requires a MINION or ALL target",
                    path: [...path, "target"],
                });
                return;
            }
            validateReconversionTarget(action.target, ctx, [...path, "target"]);
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "MIND_CONTROL": {
            if (!action.target) {
                ctx.addIssue({
                    code: "custom",
                    message: "MIND_CONTROL action requires a MINION or ALL target",
                    path: [...path, "target"],
                });
                return;
            }
            validateMindControlTarget(action.target, ctx, [...path, "target"]);
            validateTargetFilters(action.target, false, ctx, [...path, "target"]);
            break;
        }
        case "SUMMON": {
            validateSummonPayload(action, ctx, path);
            break;
        }
        case "DECK_CARD": {
            validateDeckCardPayload(action, ctx, path);
            break;
        }
        case "HAND_CARD": {
            validateHandCardPayload(action, ctx, path);
            break;
        }
        case "DISCOVER": {
            if (action.optionCount <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "DISCOVER action requires optionCount > 0",
                    path: [...path, "optionCount"],
                });
            }
            break;
        }
        case "MANA": {
            if (action.subtype !== "TEMPORARY_CHANGE") {
                ctx.addIssue({
                    code: "custom",
                    message: "MANA action requires subtype TEMPORARY_CHANGE",
                    path: [...path, "subtype"],
                });
                return;
            }
            if (action.amountScale !== null) {
                if (action.amountScale.amountPer <= 0) {
                    ctx.addIssue({
                        code: "custom",
                        message: "MANA amountScale requires amountPer > 0",
                        path: [...path, "amountScale", "amountPer"],
                    });
                }
                break;
            }
            if (action.amount <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "MANA TEMPORARY_CHANGE action requires amount > 0",
                    path: [...path, "amount"],
                });
            }
            break;
        }
        case "DEFEAT":
            break;
    }

    if ("onTargetResult" in action && action.onTargetResult != null) {
        ctx.addIssue({
            code: "custom",
            message: "onTargetResult is only allowed on targeted DAMAGE actions",
            path: [...path, "onTargetResult"],
        });
    }
};

export const validateCardAction = (
    action: CardActionDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
    options: { allowTargeted?: boolean; deathrattle?: boolean } = {},
) => {
    if (options.deathrattle && "isTargeted" in action && action.isTargeted) {
        ctx.addIssue({
            code: "custom",
            message: "Deathrattle action cannot be targeted",
            path: [...path, "isTargeted"],
        });
        return;
    }

    if ("isTargeted" in action && action.isTargeted && !options.deathrattle) {
        validateTargetedAction(action, ctx, path);
        return;
    }

    validateNonTargetedAction(action, ctx, path, options);
};

const validatePassiveBoost = (
    passive: PassiveDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (!passive.passiveBoost) {
        ctx.addIssue({
            code: "custom",
            message: "BOOST passive requires passiveBoost",
            path: [...path, "passiveBoost"],
        });
        return;
    }

    const { boost, target } = passive.passiveBoost;
    validateBoostContent(boost, ctx, [...path, "passiveBoost", "boost"]);

    if (!target) {
        ctx.addIssue({
            code: "custom",
            message: "BOOST passive requires a HERO, MINION, or ALL target",
            path: [...path, "passiveBoost", "target"],
        });
        return;
    }

    validateBoostTargetCompatibility(target, boost, ctx, path);
    validateTargetFilters(target, false, ctx, [...path, "passiveBoost", "target"]);
};

const validatePassiveTriggerTargetFilter = (
    filter: TargetDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    validateTargetFilters(filter, false, ctx, path);

    if (filter.maxTargets !== null || filter.targetSelectionMode !== null) {
        ctx.addIssue({
            code: "custom",
            message: "triggerTargetFilter cannot set maxTargets or targetSelectionMode",
            path,
        });
    }
};

export const validatePassiveDefinition = (
    passive: PassiveDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (passive.type === "ACTION") {
        if (passive.triggersOn === null) {
            ctx.addIssue({
                code: "custom",
                message: "ACTION passive requires triggersOn",
                path: [...path, "triggersOn"],
            });
        }

        if (!passive.action) {
            ctx.addIssue({
                code: "custom",
                message: "ACTION passive requires action",
                path: [...path, "action"],
            });
            return;
        }

        if (passive.passiveBoost !== null) {
            ctx.addIssue({
                code: "custom",
                message: "ACTION passive cannot have passiveBoost",
                path: [...path, "passiveBoost"],
            });
        }

        if (passive.triggersOn !== "PLAY_CARD" && passive.playCardFilter !== null) {
            ctx.addIssue({
                code: "custom",
                message: "playCardFilter is only allowed for PLAY_CARD passives",
                path: [...path, "playCardFilter"],
            });
        }

        if (passive.triggersOn !== "SUMMON" && passive.summonFilter !== null) {
            ctx.addIssue({
                code: "custom",
                message: "summonFilter is only allowed for SUMMON passives",
                path: [...path, "summonFilter"],
            });
        }

        if (passive.triggersOn === "SUMMON" && passive.playCardFilter !== null) {
            ctx.addIssue({
                code: "custom",
                message: "SUMMON passive cannot have playCardFilter",
                path: [...path, "playCardFilter"],
            });
        }

        if (
            passive.triggersOn !== "HEAL" &&
            passive.triggersOn !== "DAMAGE" &&
            passive.triggerTargetFilter !== null
        ) {
            ctx.addIssue({
                code: "custom",
                message: "triggerTargetFilter is only allowed for HEAL and DAMAGE passives",
                path: [...path, "triggerTargetFilter"],
            });
        }

        if (passive.triggerTargetFilter !== null) {
            validatePassiveTriggerTargetFilter(passive.triggerTargetFilter, ctx, [
                ...path,
                "triggerTargetFilter",
            ]);
        }

        validateCardAction(passive.action, ctx, [...path, "action"], { deathrattle: true });
        return;
    }

    if (passive.type === "BOOST") {
        if (passive.playCardFilter !== null) {
            ctx.addIssue({
                code: "custom",
                message: "BOOST passive cannot have playCardFilter",
                path: [...path, "playCardFilter"],
            });
        }

        if (passive.summonFilter !== null) {
            ctx.addIssue({
                code: "custom",
                message: "BOOST passive cannot have summonFilter",
                path: [...path, "summonFilter"],
            });
        }

        if (passive.triggerTargetFilter !== null) {
            ctx.addIssue({
                code: "custom",
                message: "BOOST passive cannot have triggerTargetFilter",
                path: [...path, "triggerTargetFilter"],
            });
        }

        if (passive.triggersOn !== null) {
            ctx.addIssue({
                code: "custom",
                message: "BOOST passive cannot have triggersOn",
                path: [...path, "triggersOn"],
            });
        }

        if (passive.action !== null) {
            ctx.addIssue({
                code: "custom",
                message: "BOOST passive cannot have action",
                path: [...path, "action"],
            });
        }

        validatePassiveBoost(passive, ctx, path);
        return;
    }

    ctx.addIssue({
        code: "custom",
        message: `Passive type ${passive.type} is not supported`,
        path: [...path, "type"],
    });
};

export const validateComparisonRefinement = (
    comparison: ComparisonDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    validateComparisonSnapshot(comparison, ctx, path);
};
