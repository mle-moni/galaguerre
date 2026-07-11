import type { CardActionFieldsSnapshot } from "#api_types/game.types";
import { hasBoostEffect } from "./boost_utils.js";
import { V1_ACTION_TYPES } from "./v1_action_types.js";

export const isV1Action = (action: CardActionFieldsSnapshot): boolean => {
    if (action.isTargeted) return false;
    if (!V1_ACTION_TYPES.includes(action.type as (typeof V1_ACTION_TYPES)[number])) return false;

    switch (action.type) {
        case "DAMAGE":
            if (action.damage <= 0) return false;
            if (action.target === null) return true;
            return (
                action.target.type === "HERO" ||
                action.target.type === "MINION" ||
                action.target.type === "ALL"
            );
        case "HEAL":
            if (action.heal <= 0) return false;
            if (action.target === null) return true;
            return (
                action.target.type === "HERO" ||
                action.target.type === "MINION" ||
                action.target.type === "ALL"
            );
        case "DRAW":
            return action.drawCount > 0;
        case "ENEMY_DRAW":
            return action.enemyDrawCount > 0;
        case "BOOST":
            return hasBoostEffect(action.boost) && action.target !== null;
        case "SILENCE":
            return (
                action.target !== null &&
                (action.target.type === "MINION" || action.target.type === "ALL")
            );
        case "DESTROY":
            return (
                action.target !== null &&
                (action.target.type === "MINION" || action.target.type === "ALL")
            );
        case "BREAK_WEAPON":
            return action.target !== null && action.target.type === "HERO";
        case "RECONVERSION":
            return (
                action.target !== null &&
                (action.target.type === "MINION" || action.target.type === "ALL")
            );
        case "MIND_CONTROL":
            return (
                action.target !== null &&
                (action.target.type === "MINION" || action.target.type === "ALL")
            );
        case "SUMMON":
            return action.summonCount > 0;
        case "DECK_CARD":
            if (action.deckCardOperation === "ADD") {
                return action.copyCount !== null && action.copyCount > 0;
            }
            return action.copyCount === null || action.copyCount > 0;
        case "HAND_CARD":
            return action.copyCount > 0;
        case "DISCOVER":
            return action.optionCount > 0;
        case "MANA":
            return (
                action.subtype === "TEMPORARY_CHANGE" &&
                (action.amount > 0 || action.amountScale !== null)
            );
        case "NEXT_SPELL_COST_REDUCTION":
            return action.amount > 0;
        case "DEFEAT":
            return true;
        default:
            return false;
    }
};
