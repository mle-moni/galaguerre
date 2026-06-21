import type { PassiveTriggerEntry } from "./collect_passive_triggers.js";
import type Game from "#models/game";
import { executeAction } from "../action_engine/execute_action.js";
import { isTargetedV1Action } from "../action_engine/is_targeted_v1_action.js";
import { isV1Action } from "../action_engine/is_v1_action.js";
import { beginLoggedBeatIfNone, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";

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
    let openedStandaloneBeat = false;

    for (const entry of entries) {
        const action = entry.passive.action;
        if (!action) continue;
        if (!isV1Action(action) && !isTargetedV1Action(action)) continue;

        const opponent = getOpponent(game, entry.owner);
        const sourceMinion = entry.owner.board[entry.sourceBoardIndex] ?? undefined;

        withNarrativeRecorder((recorder) => {
            if (!recorder.hasCurrentBeat()) {
                beginLoggedBeatIfNone(game, "TRIGGER");
                openedStandaloneBeat = true;
            }

            if (sourceMinion) {
                recorder.recordEffect({
                    type: "TRIGGER",
                    cardUuid: sourceMinion.uuid,
                    owner: entry.sourceOwner,
                    trigger: "PASSIVE",
                });
            }
        });

        executeAction(action, game, entry.owner, opponent, undefined, 0, sourceMinion);

        if (isGameOver(game)) {
            if (openedStandaloneBeat) {
                endCurrentBeat(game);
            }
            return { gameEnded: true };
        }
    }

    if (openedStandaloneBeat) {
        endCurrentBeat(game);
    }

    return { gameEnded: false };
};
