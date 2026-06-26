import type { CardActionSnapshot } from "#api_types/game.types";
import { hasBoostEffect } from "./boost_utils.js";
import { V1_ACTION_TYPES } from "./v1_action_types.js";

export const isDeathrattleV1Action = (action: CardActionSnapshot): boolean => {
    if (action.isTargeted) return false;
    if (!V1_ACTION_TYPES.includes(action.type as (typeof V1_ACTION_TYPES)[number])) return false;

    switch (action.type) {
        case "DAMAGE":
            return action.damage > 0;
        case "HEAL":
            return action.heal > 0;
        case "DRAW":
            return action.drawCount > 0;
        case "ENEMY_DRAW":
            return action.enemyDrawCount > 0;
        case "BOOST":
            return hasBoostEffect(action.boost) && action.target !== null;
        case "DESTROY":
            return (
                action.target !== null &&
                (action.target.type === "MINION" || action.target.type === "ALL")
            );
        case "BREAK_WEAPON":
            return action.target !== null && action.target.type === "HERO";
        case "SUMMON":
            return action.summonCount > 0;
        case "DECK_CARD":
            if (action.deckCardOperation === "ADD") {
                return action.copyCount !== null && action.copyCount > 0;
            }
            return action.copyCount === null || action.copyCount > 0;
        case "HAND_CARD":
            return action.copyCount > 0;
        case "MANA":
            return (
                action.subtype === "TEMPORARY_CHANGE" &&
                (action.amount > 0 || action.amountScale !== null)
            );
        default:
            return false;
    }
};
