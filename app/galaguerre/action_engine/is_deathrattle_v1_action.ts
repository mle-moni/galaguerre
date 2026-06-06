import type { CardActionSnapshot } from "#api_types/game.types";
import { hasBoostEffect } from "./boost_utils.js";
import { V1_ACTION_TYPES } from "./v1_action_types.js";

export const isDeathrattleV1Action = (action: CardActionSnapshot): boolean => {
    if (action.isTargeted) return false;
    if (!V1_ACTION_TYPES.includes(action.type as (typeof V1_ACTION_TYPES)[number])) return false;

    switch (action.type) {
        case "DAMAGE":
            if (action.damage === null || action.damage <= 0) return false;
            if (action.target !== null) {
                return action.target.type === "HERO" || action.target.type === "MINION";
            }
            return true;
        case "HEAL":
            if (action.heal === null || action.heal <= 0) return false;
            if (action.target !== null) {
                return action.target.type === "HERO" || action.target.type === "MINION";
            }
            return true;
        case "DRAW":
            return action.drawCount !== null && action.drawCount > 0;
        case "ENEMY_DRAW":
            return action.enemyDrawCount !== null && action.enemyDrawCount > 0;
        case "BOOST":
            if (!action.boost || !hasBoostEffect(action.boost)) return false;
            if (action.target !== null) {
                return action.target.type === "HERO" || action.target.type === "MINION";
            }
            return false;
        default:
            return false;
    }
};
