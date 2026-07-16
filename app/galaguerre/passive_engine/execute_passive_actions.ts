import type { PassiveTriggerEntry } from "./collect_passive_triggers.js";
import type Game from "#models/game";
import { findMinionOnPlayerBoard } from "../action_engine/find_minion_on_board.js";
import { executeActionSequence } from "../action_engine/execute_action_sequence.js";
import { beginLoggedBeatIfNone, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executePassiveActions = (
    game: Game,
    entries: PassiveTriggerEntry[],
): { gameEnded: boolean; discoverPending: boolean } => {
    let openedStandaloneBeat = false;

    for (const entry of entries) {
        const action = entry.passive.action;
        if (!action) continue;

        const opponent =
            entry.owner === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
        const sourceMinion = findMinionOnPlayerBoard(entry.owner, entry.sourceMinionUuid);

        withNarrativeRecorder((recorder) => {
            if (!recorder.hasCurrentBeat()) {
                beginLoggedBeatIfNone(game, "TRIGGER");
                openedStandaloneBeat = true;
            }

            recorder.recordEffect({
                type: "TRIGGER",
                cardUuid: entry.sourceMinionUuid,
                owner: entry.sourceOwner,
                trigger: "PASSIVE",
            });
        });

        const result = executeActionSequence(game, entry.owner, opponent, [action], {
            sourceCard: entry.sourceCard,
            effectKind: "PASSIVE",
            sourceMinion,
        });

        if (result.discoverPending) {
            return result;
        }

        if (result.gameEnded || isGameOver(game)) {
            if (openedStandaloneBeat) {
                endCurrentBeat(game);
            }
            return { gameEnded: true, discoverPending: false };
        }
    }

    if (openedStandaloneBeat) {
        endCurrentBeat(game);
    }

    return { gameEnded: false, discoverPending: false };
};
