import type { PassiveTriggerEntry } from "./collect_passive_triggers.js";
import type Game from "#models/game";
import { executeAction } from "../action_engine/execute_action.js";
import { isTargetedV1Action } from "../action_engine/is_targeted_v1_action.js";
import { isV1Action } from "../action_engine/is_v1_action.js";

const getOpponent = (game: Game, player: PassiveTriggerEntry["owner"]) => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executePassiveActions = (
    game: Game,
    entries: PassiveTriggerEntry[],
): { gameEnded: boolean } => {
    for (const entry of entries) {
        const action = entry.passive.action;
        if (!action) continue;
        if (!isV1Action(action) && !isTargetedV1Action(action)) continue;

        const opponent = getOpponent(game, entry.owner);
        const sourceMinion = entry.owner.board[entry.sourceBoardIndex] ?? undefined;
        executeAction(action, game, entry.owner, opponent, undefined, 0, sourceMinion);

        if (isGameOver(game)) {
            return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
