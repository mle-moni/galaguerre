import type { PassiveTriggerEntry } from "./collect_passive_triggers.js";
import type Game from "#models/game";
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

        const sourceCard = sourceMinion?.originalCard;
        if (!sourceCard) continue;

        const result = executeActionSequence(game, entry.owner, opponent, [action], {
            sourceCard: {
                cardId: sourceCard.cardId,
                label: sourceCard.label,
                uuid: sourceCard.uuid,
            },
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
