import type { GamePlayer } from "#api_types/game.types";
import type { ActionConditionSnapshot } from "#api_types/card.types";
import { countBoardMinionsOnBoard } from "#api_types/board";

export const countBoardMinions = (player: GamePlayer): number => {
    return countBoardMinionsOnBoard(player.board);
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
