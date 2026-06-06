import { V1_ACTION_TYPES } from "../action_engine/v1_action_types.js";
import type Action from "#models/action";

export type ActionValidationError = {
    actionId: number;
    internalLabel: string;
    reason: string;
};

const TARGETED_V1_ACTION_TYPES = ["DAMAGE", "HEAL"] as const;

const findHeroTarget = (action: Action) => {
    return action.toolToTargets?.find((toolToTarget) => toolToTarget.target?.type === "HERO");
};

const findTargetableTarget = (action: Action) => {
    return action.toolToTargets?.find(
        (toolToTarget) =>
            toolToTarget.target?.type === "HERO" || toolToTarget.target?.type === "MINION",
    );
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
            reason: "Targeted action requires a HERO or MINION target via tool_to_target",
        };
    }

    if (target.type === "ALL") {
        return {
            actionId: action.id,
            internalLabel: action.internalLabel,
            reason: "Targeted action cannot use ALL target type",
        };
    }

    if (target.comparisonId !== null || target.tagId !== null) {
        if (target.type !== "MINION") {
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: "comparison and tag filters require a MINION target type",
            };
        }
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

            if (!findHeroTarget(action)) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "DAMAGE action requires a HERO target via tool_to_target",
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

            if (!findHeroTarget(action)) {
                return {
                    actionId: action.id,
                    internalLabel: action.internalLabel,
                    reason: "HEAL action requires a HERO target via tool_to_target",
                };
            }

            return null;
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
        default:
            return {
                actionId: action.id,
                internalLabel: action.internalLabel,
                reason: `Action type ${action.type} is not supported`,
            };
    }
};
