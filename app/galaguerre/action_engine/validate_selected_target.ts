import type { ActionTarget, CardActionSnapshot, GamePlayer } from "#api_types/game.types";
import { selectedTargetMatchesAction } from "#api_types/target_matching";

export const validateSelectedTargetForAction = (
    selectedTarget: ActionTarget,
    action: CardActionSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
): boolean => {
    if (!action.isTargeted || !action.target) return false;

    return selectedTargetMatchesAction(selectedTarget, action, player.board, opponent.board);
};
