import {
    modelBoostHasEffect,
    modelBoostHasMinionStats,
    modelBoostHasSpellPower,
} from "../action_engine/boost_utils.js";
import type Boost from "#models/boost";
import type Passive from "#models/passive";
import type Target from "#models/target";
import type { ActionValidationError } from "./validate_action.js";
import { validateComparison } from "./validate_comparison.js";
import { validateDeathrattleAction } from "./validate_deathrattle_action.js";
import { validateTargetExcludeSelf } from "./validate_exclude_self.js";

export type PassiveValidationError = {
    passiveId: number;
    internalLabel: string;
    reason: string;
};

const findAllTarget = (boost: Boost) => {
    return boost.toolToTargets?.find((toolToTarget) => toolToTarget.target?.type === "ALL");
};

const findHeroTarget = (boost: Boost) => {
    return boost.toolToTargets?.find((toolToTarget) => toolToTarget.target?.type === "HERO");
};

const findMinionTarget = (boost: Boost) => {
    return boost.toolToTargets?.find((toolToTarget) => toolToTarget.target?.type === "MINION");
};

const validateBoostTargetCompatibility = (
    passive: Passive,
    target: Target,
    boost: Boost,
): PassiveValidationError | null => {
    if (target.type === "MINION") {
        if (modelBoostHasSpellPower(boost) && !modelBoostHasMinionStats(boost)) {
            return null;
        }
        if (modelBoostHasSpellPower(boost)) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "BOOST passive spellPower cannot target MINION",
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
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "BOOST passive attack, health, and minionPower cannot target HERO",
            };
        }
        return null;
    }

    if (target.type === "ALL") {
        return null;
    }

    return null;
};

const validateMinionTargetFilters = (
    passive: Passive,
    target: Target,
): PassiveValidationError | null => {
    const excludeSelfReason = validateTargetExcludeSelf(target);
    if (excludeSelfReason) {
        return {
            passiveId: passive.id,
            internalLabel: passive.internalLabel,
            reason: excludeSelfReason,
        };
    }

    if (target.comparisonId !== null || target.tagId !== null) {
        if (target.type !== "MINION" && target.type !== "ALL") {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "comparison and tag filters require a MINION or ALL target type",
            };
        }
    }

    if (target.comparisonId !== null) {
        if (!target.comparison) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "target comparison must be preloaded for validation",
            };
        }

        const comparisonError = validateComparison(target.comparison);
        if (comparisonError) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: comparisonError.reason,
            };
        }
    }

    return null;
};

const validatePassiveBoost = (passive: Passive): PassiveValidationError | null => {
    if (passive.boostId === null) {
        return {
            passiveId: passive.id,
            internalLabel: passive.internalLabel,
            reason: "BOOST passive requires boostId",
        };
    }

    if (!passive.boost) {
        return {
            passiveId: passive.id,
            internalLabel: passive.internalLabel,
            reason: "BOOST passive requires preloaded boost for validation",
        };
    }

    if (!modelBoostHasEffect(passive.boost)) {
        return {
            passiveId: passive.id,
            internalLabel: passive.internalLabel,
            reason: "BOOST passive requires at least one non-null effect (attack, health, spellPower, or minionPower)",
        };
    }

    const allTarget = findAllTarget(passive.boost);
    const minionTarget = findMinionTarget(passive.boost);
    const heroTarget = findHeroTarget(passive.boost);

    if (allTarget?.target) {
        return validateMinionTargetFilters(passive, allTarget.target);
    }

    if (minionTarget?.target) {
        const compatibilityError = validateBoostTargetCompatibility(
            passive,
            minionTarget.target,
            passive.boost,
        );
        if (compatibilityError) return compatibilityError;
        return validateMinionTargetFilters(passive, minionTarget.target);
    }

    if (heroTarget?.target) {
        const excludeSelfReason = validateTargetExcludeSelf(heroTarget.target);
        if (excludeSelfReason) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: excludeSelfReason,
            };
        }

        const compatibilityError = validateBoostTargetCompatibility(
            passive,
            heroTarget.target,
            passive.boost,
        );
        if (compatibilityError) return compatibilityError;
        return null;
    }

    return {
        passiveId: passive.id,
        internalLabel: passive.internalLabel,
        reason: "BOOST passive requires a HERO, MINION, or ALL target via tool_to_target",
    };
};

const mapActionError = (
    passive: Passive,
    actionError: ActionValidationError,
): PassiveValidationError => ({
    passiveId: passive.id,
    internalLabel: passive.internalLabel,
    reason: actionError.reason,
});

export const validatePassive = (passive: Passive): PassiveValidationError | null => {
    if (passive.type === "ACTION") {
        if (passive.triggersOn === null) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "ACTION passive requires triggersOn",
            };
        }

        if (passive.actionId === null) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "ACTION passive requires actionId",
            };
        }

        if (passive.boostId !== null) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "ACTION passive cannot have boostId",
            };
        }

        if (!passive.action) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "ACTION passive requires preloaded action for validation",
            };
        }

        const actionError = validateDeathrattleAction(passive.action);
        if (actionError) return mapActionError(passive, actionError);

        return null;
    }

    if (passive.type === "BOOST") {
        if (passive.triggersOn !== null) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "BOOST passive cannot have triggersOn",
            };
        }

        if (passive.actionId !== null) {
            return {
                passiveId: passive.id,
                internalLabel: passive.internalLabel,
                reason: "BOOST passive cannot have actionId",
            };
        }

        return validatePassiveBoost(passive);
    }

    return {
        passiveId: passive.id,
        internalLabel: passive.internalLabel,
        reason: `Passive type ${passive.type} is not supported`,
    };
};
