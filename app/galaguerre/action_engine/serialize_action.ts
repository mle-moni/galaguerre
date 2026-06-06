import type { CardActionSnapshot } from "#api_types/game.types";
import type Action from "#models/action";

export const serializeAction = (action: Action): CardActionSnapshot => ({
    type: action.type,
    isTargeted: action.isTargeted,
    damage: action.damage,
    heal: action.heal,
    drawCount: action.drawCount,
    enemyDrawCount: action.enemyDrawCount,
});
