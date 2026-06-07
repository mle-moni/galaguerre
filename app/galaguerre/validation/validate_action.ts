import { V1_ACTION_TYPES } from "../action_engine/v1_action_types.js";
import {
    modelBoostHasEffect,
    modelBoostHasMinionStats,
    modelBoostHasSpellPower,
} from "../action_engine/boost_utils.js";
import type Action from "#models/action";
import type Boost from "#models/boost";
import type Target from "#models/target";
import { validateComparison } from "./validate_comparison.js";
import { validateTargetExcludeSelf } from "./validate_exclude_self.js";
import { validateTargetSelection } from "./validate_target_selection.js";

export type ActionValidationError = {
    actionId: number;
    internalLabel: string;
    reason: string;
};

const TARGETED_V1_ACTION_TYPES = ["DAMAGE", "HEAL", "BOOST"] as const;

const findAllTarget = (action: Action) => {
    return action.toolToTargets?.find((toolToTarget) => toolToTarget.target?.type === "ALL");
};

const findHeroTarget = (action: Action) => {
    return action.toolToTargets?.find((toolToTarget) => toolToTarget.target?.type === "HERO");
};

const findMinionTarget = (action: Action) => {
    return action.toolToTargets?.find((toolToTarget) => toolToTarget.target?.type === "MINION");
};

const findTargetableTarget = (action: Action) => {
    return action.toolToTargets?.find(
        (toolToTarget) =>
            toolToTarget.target?.type === "HERO" ||
            toolToTarget.target?.type === "MINION" ||
            toolToTarget.target?.type === "ALL",
    );
};

const validateBoostContent = (action: Action): ActionValidationError | null => {
    if (action.boostId === null) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: "BOOST action requires boostId",
        };
    }

    if (!action.boost) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: "BOOST action requires preloaded boost for validation",
        };
    }

    if (!modelBoostHasEffect(action.boost)) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: "BOOST requires at least one non-null effect (attack, health, spellPower, or minionPower)",
        };
    }

    return null;
};

const validateBoostTargetCompatibility = (
    action: Action,
    target: Target,
    boost: Boost,
): ActionValidationError | null => {
    if (target.type === "MINION") {
        if (modelBoostHasSpellPower(boost) && !modelBoostHasMinionStats(boost)) {
            return null;
        }
        if (modelBoostHasSpellPower(boost)) {
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "BOOST spellPower cannot target MINION",
            };
        }
        return null;
    }

    if (target.type === "HERO") {
        if (modelBoostHasMinionStats(boost) && !modelBoostHasSpellPower(boost)) {
            return null;
        }
        if (modelBoostHasMinionStats(boost)) {
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "BOOST attack, health, and minionPower cannot target HERO",
            };
        }
        return null;
    }

    if (target.type === "ALL") {
        return null;
    }

    return null;
};

const validateTargetFilters = (action: Action, target: Target): ActionValidationError | null => {
    const excludeSelfReason = validateTargetExcludeSelf(target);
    if (excludeSelfReason) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: excludeSelfReason,
        };
    }

    const selectionReason = validateTargetSelection(target, action.isTargeted);
    if (selectionReason) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: selectionReason,
        };
    }

    if (target.comparisonId !== null || target.tagId !== null) {
        if (target.type !== "MINION" && target.type !== "ALL") {
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "comparison and tag filters require a MINION or ALL target type",
            };
        }
    }

    if (target.comparisonId !== null) {
        if (!target.comparison) {
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "target comparison must be preloaded for validation",
            };
        }

        const comparisonError = validateComparison(target.comparison);
        if (comparisonError) {
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: comparisonError.reason,
            };
        }
    }

    return null;
};

const validateTargetedAction = (action: Action): ActionValidationError | null => {
    if (
        !TARGETED_V1_ACTION_TYPES.includes(action.type as (typeof TARGETED_V1_ACTION_TYPES)[number])
    ) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: `Targeted action type ${action.type} is not supported`,
        };
    }

    const toolToTarget = findTargetableTarget(action);
    const target = toolToTarget?.target;

    if (!target) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: "Targeted action requires a HERO, MINION, or ALL target via tool_to_target",
        };
    }

    const filterError = validateTargetFilters(action, target);
    if (filterError) return filterError;

    switch (action.type) {
        case "DAMAGE": {
            if (action.damage === null || action.damage <= 0) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "DAMAGE action requires damage > 0",
                };
            }
            return null;
        }
        case "HEAL": {
            if (action.heal === null || action.heal <= 0) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "HEAL action requires heal > 0",
                };
            }
            return null;
        }
        case "BOOST": {
            const boostError = validateBoostContent(action);
            if (boostError) return boostError;
            return validateBoostTargetCompatibility(action, target, action.boost!);
        }
        default:
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: `Targeted action type ${action.type} is not supported`,
            };
    }
};

export const validateAction = (action: Action): ActionValidationError | null => {
    if (action.isTargeted) {
        return validateTargetedAction(action);
    }

    if (!V1_ACTION_TYPES.includes(action.type as (typeof V1_ACTION_TYPES)[number])) {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: `Action type ${action.type} is not supported`,
        };
    }

    switch (action.type) {
        case "DAMAGE": {
            if (action.damage === null || action.damage <= 0) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "DAMAGE action requires damage > 0",
                };
            }

            const allTarget = findAllTarget(action);
            const minionTarget = findMinionTarget(action);
            const heroTarget = findHeroTarget(action);

            if (allTarget?.target) {
                return validateTargetFilters(action, allTarget.target);
            }

            if (minionTarget?.target) {
                return validateTargetFilters(action, minionTarget.target);
            }

            if (heroTarget?.target) {
                return null;
            }

            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "DAMAGE action requires a HERO, MINION, or ALL target via tool_to_target",
            };
        }
        case "HEAL": {
            if (action.heal === null || action.heal <= 0) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "HEAL action requires heal > 0",
                };
            }

            const allTarget = findAllTarget(action);
            const minionTarget = findMinionTarget(action);
            const heroTarget = findHeroTarget(action);

            if (allTarget?.target) {
                return validateTargetFilters(action, allTarget.target);
            }

            if (minionTarget?.target) {
                return validateTargetFilters(action, minionTarget.target);
            }

            if (heroTarget?.target) {
                return null;
            }

            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "HEAL action requires a HERO, MINION, or ALL target via tool_to_target",
            };
        }
        case "DRAW": {
            if (action.drawCount === null || action.drawCount <= 0) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "DRAW action requires drawCount > 0",
                };
            }

            return null;
        }
        case "ENEMY_DRAW": {
            if (action.enemyDrawCount === null || action.enemyDrawCount <= 0) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "ENEMY_DRAW action requires enemyDrawCount > 0",
                };
            }

            return null;
        }
        case "BOOST": {
            const boostError = validateBoostContent(action);
            if (boostError) return boostError;

            const allTarget = findAllTarget(action);
            const minionTarget = findMinionTarget(action);
            const heroTarget = findHeroTarget(action);

            if (allTarget?.target) {
                return validateTargetFilters(action, allTarget.target);
            }

            if (minionTarget?.target) {
                const compatibilityError = validateBoostTargetCompatibility(
                    action,
                    minionTarget.target,
                    action.boost!,
                );
                if (compatibilityError) return compatibilityError;
                return null;
            }

            if (heroTarget?.target) {
                const compatibilityError = validateBoostTargetCompatibility(
                    action,
                    heroTarget.target,
                    action.boost!,
                );
                if (compatibilityError) return compatibilityError;
                return null;
            }

            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "BOOST action requires a HERO, MINION, or ALL target via tool_to_target",
            };
        }
        default:
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: `Action type ${action.type} is not supported`,
            };
    }
};
