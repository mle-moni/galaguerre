import type { z } from "zod";
import {
    boostHasEffect,
    boostHasMinionStats,
    boostHasSpellPower,
} from "./action_engine/boost_utils.js";
import { V1_ACTION_TYPES } from "./action_engine/v1_action_types.js";
import { GALAGUERRE_TARGET_SELECTION_MODES } from "./galaguerre.types.js";
import type { CardTag } from "./card_tags.js";
import { MinionPower } from "./card_definition.schema.ts";

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

export type CardActionDefinition = {
    type: "DAMAGE" | "HEAL" | "DRAW" | "ENEMY_DRAW" | "BOOST" | "SILENCE";
    isTargeted: boolean;
    damage: number | null;
    heal: number | null;
    drawCount: number | null;
    enemyDrawCount: number | null;
    drawCardFilter: CardFilterDefinition | null;
    enemyDrawCardFilter: CardFilterDefinition | null;
    boost: BoostDefinition | null;
    target: TargetDefinition | null;
};

export type PassiveDefinition = {
    type: "ACTION" | "BOOST";
    triggersOn: "TURN_END" | "TURN_BEGIN" | "DRAW" | "HEAL" | null;
    action: CardActionDefinition | null;
    passiveBoost: { boost: BoostDefinition; target: TargetDefinition | null } | null;
};

const TARGETED_ACTION_TYPES = ["DAMAGE", "HEAL", "BOOST", "SILENCE"] as const;

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

const validateSilencePayload = (
    action: CardActionDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
) => {
    if (action.damage !== null) {
        ctx.addIssue({
            code: "custom",
            message: "SILENCE action must not set damage",
            path: [...path, "damage"],
        });
    }
    if (action.heal !== null) {
        ctx.addIssue({
            code: "custom",
            message: "SILENCE action must not set heal",
            path: [...path, "heal"],
        });
    }
    if (action.drawCount !== null) {
        ctx.addIssue({
            code: "custom",
            message: "SILENCE action must not set drawCount",
            path: [...path, "drawCount"],
        });
    }
    if (action.enemyDrawCount !== null) {
        ctx.addIssue({
            code: "custom",
            message: "SILENCE action must not set enemyDrawCount",
            path: [...path, "enemyDrawCount"],
        });
    }
    if (action.boost !== null) {
        ctx.addIssue({
            code: "custom",
            message: "SILENCE action must not set boost",
            path: [...path, "boost"],
        });
    }
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

const validateTargetedAction = (
    action: CardActionDefinition,
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
            if (action.damage === null || action.damage <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "DAMAGE action requires damage > 0",
                    path: [...path, "damage"],
                });
            }
            break;
        case "HEAL":
            if (action.heal === null || action.heal <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "HEAL action requires heal > 0",
                    path: [...path, "heal"],
                });
            }
            break;
        case "BOOST":
            if (!action.boost) {
                ctx.addIssue({
                    code: "custom",
                    message: "BOOST action requires boost",
                    path: [...path, "boost"],
                });
                return;
            }
            validateBoostContent(action.boost, ctx, [...path, "boost"]);
            validateBoostTargetCompatibility(action.target, action.boost, ctx, path);
            break;
        case "SILENCE":
            validateSilencePayload(action, ctx, path);
            validateSilenceTarget(action.target, ctx, [...path, "target"]);
            break;
    }
};

const validateNonTargetedAction = (
    action: CardActionDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
    options: { allowTargeted?: boolean } = {},
) => {
    if (action.isTargeted) {
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
            if (action.damage === null || action.damage <= 0) {
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
            if (action.heal === null || action.heal <= 0) {
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
            if (action.drawCount === null || action.drawCount <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "DRAW action requires drawCount > 0",
                    path: [...path, "drawCount"],
                });
            }
            break;
        case "ENEMY_DRAW":
            if (action.enemyDrawCount === null || action.enemyDrawCount <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "ENEMY_DRAW action requires enemyDrawCount > 0",
                    path: [...path, "enemyDrawCount"],
                });
            }
            break;
        case "BOOST": {
            if (!action.boost) {
                ctx.addIssue({
                    code: "custom",
                    message: "BOOST action requires boost",
                    path: [...path, "boost"],
                });
                return;
            }
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
            validateSilencePayload(action, ctx, path);
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
    }
};

export const validateCardAction = (
    action: CardActionDefinition,
    ctx: z.RefinementCtx,
    path: (string | number)[],
    options: { allowTargeted?: boolean; deathrattle?: boolean } = {},
) => {
    if (options.deathrattle && action.isTargeted) {
        ctx.addIssue({
            code: "custom",
            message: "Deathrattle action cannot be targeted",
            path: [...path, "isTargeted"],
        });
        return;
    }

    if (action.isTargeted && !options.deathrattle) {
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

        validateCardAction(passive.action, ctx, [...path, "action"], { deathrattle: true });
        return;
    }

    if (passive.type === "BOOST") {
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
