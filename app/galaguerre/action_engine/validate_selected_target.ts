import type { ActionTarget, CardActionSnapshot, GamePlayer } from "#api_types/game.types";
import { selectedTargetMatchesAction } from "#api_types/target_matching";
import { playerHasBoardSpace } from "./apply_mind_control.js";

export const validateSelectedTargetForAction = (
    selectedTarget: ActionTarget,
    action: CardActionSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
): boolean => {
    if (!action.isTargeted || !action.target) return false;

    return selectedTargetMatchesAction(
        selectedTarget,
        action,
        player.board,
        opponent.board,
        playerHasBoardSpace(player),
    );
};
