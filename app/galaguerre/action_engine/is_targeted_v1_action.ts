import type { CardActionSnapshot } from "#api_types/game.types";
import { hasBoostEffect } from "./boost_utils.js";

const TARGETED_V1_ACTION_TYPES = ["DAMAGE", "HEAL", "BOOST", "SILENCE", "RECONVERSION"] as const;

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
            return action.damage !== null && action.damage > 0;
        case "HEAL":
            return action.heal !== null && action.heal > 0;
        case "BOOST":
            return action.boost !== null && hasBoostEffect(action.boost);
        case "SILENCE":
            return action.target.type === "MINION" || action.target.type === "ALL";
        case "RECONVERSION":
            return (
                action.reconvertCardId !== null &&
                action.reconvertCardId > 0 &&
                (action.target.type === "MINION" || action.target.type === "ALL")
            );
        default:
            return false;
    }
};
