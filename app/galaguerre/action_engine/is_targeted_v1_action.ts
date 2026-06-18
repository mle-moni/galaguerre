import type { CardActionSnapshot } from "#api_types/game.types";
import { hasBoostEffect } from "./boost_utils.js";

const TARGETED_V1_ACTION_TYPES = [
    "DAMAGE",
    "HEAL",
    "BOOST",
    "SILENCE",
    "DESTROY",
    "BREAK_WEAPON",
    "RECONVERSION",
    "MIND_CONTROL",
] as const;

export const isTargetedV1Action = (action: CardActionSnapshot): boolean => {
    if (!action.isTargeted) return false;
    if (
        !TARGETED_V1_ACTION_TYPES.includes(action.type as (typeof TARGETED_V1_ACTION_TYPES)[number])
    ) {
        return false;
    }

    if (!action.target) return false;

    switch (action.type) {
        case "DAMAGE":
            return action.damage > 0;
        case "HEAL":
            return action.heal > 0;
        case "BOOST":
            return hasBoostEffect(action.boost);
        case "SILENCE":
            return action.target.type === "MINION" || action.target.type === "ALL";
        case "DESTROY":
            return action.target.type === "MINION" || action.target.type === "ALL";
        case "BREAK_WEAPON":
            return action.target.type === "HERO";
        case "RECONVERSION":
            return action.target.type === "MINION" || action.target.type === "ALL";
        case "MIND_CONTROL":
            return action.target.type === "MINION" || action.target.type === "ALL";
        default:
            return false;
    }
};
