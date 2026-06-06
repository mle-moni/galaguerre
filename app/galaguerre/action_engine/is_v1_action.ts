import type { CardActionSnapshot } from "#api_types/game.types";

const V1_ACTION_TYPES = ["DAMAGE", "HEAL", "DRAW", "ENEMY_DRAW"] as const;

export const isV1Action = (action: CardActionSnapshot): boolean => {
    if (action.isTargeted) return false;
    if (!V1_ACTION_TYPES.includes(action.type as (typeof V1_ACTION_TYPES)[number])) return false;

    switch (action.type) {
        case "DAMAGE":
            return action.damage !== null && action.damage > 0;
        case "HEAL":
            return action.heal !== null && action.heal > 0;
        case "DRAW":
            return action.drawCount !== null && action.drawCount > 0;
        case "ENEMY_DRAW":
            return action.enemyDrawCount !== null && action.enemyDrawCount > 0;
        default:
            return false;
    }
};
