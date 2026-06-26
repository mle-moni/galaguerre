import type { CardActionFieldsSnapshot, GamePlayer } from "#api_types/game.types";
import { countBoardMinionsOnBoard } from "#api_types/board";

type ManaAction = Extract<CardActionFieldsSnapshot, { type: "MANA" }>;

export const resolveManaAmount = (
    action: ManaAction,
    _player: GamePlayer,
    opponent: GamePlayer,
): number => {
    if (!action.amountScale) return action.amount;

    const { source, amountPer } = action.amountScale;
    switch (source) {
        case "OPPONENT_MINION_COUNT":
            return countBoardMinionsOnBoard(opponent.board) * amountPer;
    }
};
