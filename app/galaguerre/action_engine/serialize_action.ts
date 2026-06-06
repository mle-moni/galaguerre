import type { CardActionSnapshot } from "#api_types/game.types";
import type Action from "#models/action";

export const serializeAction = (action: Action): CardActionSnapshot => {
    const toolToTarget = action.toolToTargets?.[0];

    return {
        type: action.type,
        isTargeted: action.isTargeted,
        damage: action.damage,
        heal: action.heal,
        drawCount: action.drawCount,
        enemyDrawCount: action.enemyDrawCount,
        target: toolToTarget?.target
            ? {
                  type: toolToTarget.target.type,
                  targetTeam: toolToTarget.target.targetTeam,
              }
            : null,
    };
};
