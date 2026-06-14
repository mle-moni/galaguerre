import type { GamePlayer } from "#api_types/game.types";
import type { ActionConditionSnapshot } from "#api_types/card.types";
import { MINION_SPOT_IDS } from "#api_types/game.types";

export const countBoardMinions = (player: GamePlayer): number => {
    return MINION_SPOT_IDS.filter((spotId) => player.board[spotId] !== null).length;
};

export const evaluateActionCondition = (
    condition: ActionConditionSnapshot | null | undefined,
    _player: GamePlayer,
    opponent: GamePlayer,
): boolean => {
    if (!condition) return true;

    if (condition.opponentMinionCountMin !== null) {
        if (countBoardMinions(opponent) < condition.opponentMinionCountMin) {
            return false;
        }
    }

    return true;
};
