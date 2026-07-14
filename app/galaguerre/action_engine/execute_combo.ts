import type {
    ActionTarget,
    CardActionSnapshot,
    GamePlayer,
    MinionCard,
} from "#api_types/game.types";
import type Game from "#models/game";
import { recordCombo } from "../game_log/record_game_log.js";
import { beginLoggedBeatIfNone, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import {
    executeActionSequence,
    type ExecuteActionSequenceOptions,
} from "./execute_action_sequence.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const recordComboTrigger = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
    openedTriggerBeat: { value: boolean },
): void => {
    recordCombo(game, player, card);
    const owner = resolveSpotOwner(game, player);

    withNarrativeRecorder((recorder) => {
        if (!recorder.hasCurrentBeat()) {
            beginLoggedBeatIfNone(game, "TRIGGER");
            openedTriggerBeat.value = true;
        }
        recorder.recordEffect({
            type: "TRIGGER",
            cardUuid: card.uuid,
            owner,
            trigger: "COMBO",
        });
    });
};

const buildComboSequenceOptions = (
    card: MinionCard,
    player: GamePlayer,
    selectedTarget?: ActionTarget,
    comboContinuation?: ExecuteActionSequenceOptions["battlecryContinuation"],
): ExecuteActionSequenceOptions => ({
    sourceCard: { cardId: card.cardId, label: card.label, uuid: card.uuid },
    effectKind: "COMBO",
    selectedTarget,
    sourceMinion: player.board.find((minion) => minion.uuid === card.uuid),
    battlecryContinuation: comboContinuation,
});

const runComboActionSequence = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
    actions: CardActionSnapshot[],
    selectedTarget: ActionTarget | undefined,
    remainingFullSequencesAfterThis: number,
): { gameEnded: boolean; discoverPending: boolean } => {
    const opponent = getOpponent(game, player);

    return executeActionSequence(game, player, opponent, actions, {
        ...buildComboSequenceOptions(
            card,
            player,
            selectedTarget,
            remainingFullSequencesAfterThis > 0
                ? { actions, remainingIterations: remainingFullSequencesAfterThis }
                : undefined,
        ),
    });
};

export const runAdditionalComboSequences = (
    game: Game,
    player: GamePlayer,
    source: { cardId: number; label: string; uuid: string },
    actions: CardActionSnapshot[],
    selectedTarget: ActionTarget | undefined,
    sequenceCount: number,
): { gameEnded: boolean; discoverPending: boolean } => {
    const minionState = player.board.find((minion) => minion.uuid === source.uuid);
    const card =
        minionState?.originalCard.type === "MINION"
            ? (minionState.originalCard as MinionCard)
            : null;
    const openedTriggerBeat = { value: false };

    for (let index = 0; index < sequenceCount; index++) {
        if (card) {
            recordComboTrigger(game, player, card, openedTriggerBeat);
        }

        const remainingFullSequencesAfterThis = sequenceCount - index - 1;
        const result = runComboActionSequence(
            game,
            player,
            card ??
                ({
                    uuid: source.uuid,
                    cardId: source.cardId,
                    label: source.label,
                    comboActions: actions,
                } as MinionCard),
            actions,
            selectedTarget,
            remainingFullSequencesAfterThis,
        );

        if (result.discoverPending) {
            return result;
        }

        if (result.gameEnded) {
            if (openedTriggerBeat.value) {
                endCurrentBeat(game);
            }
            return result;
        }
    }

    if (openedTriggerBeat.value) {
        endCurrentBeat(game);
    }

    return { gameEnded: false, discoverPending: false };
};

export const executeCombo = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
    selectedTarget?: ActionTarget,
): { gameEnded: boolean; discoverPending: boolean } => {
    const actions = card.comboActions ?? [];

    const hasValidCombo = actions.some(
        (action) => isV1Action(action) || isTargetedV1Action(action),
    );
    if (!hasValidCombo) {
        return { gameEnded: false, discoverPending: false };
    }

    const openedTriggerBeat = { value: false };
    recordComboTrigger(game, player, card, openedTriggerBeat);

    const result = runComboActionSequence(game, player, card, actions, selectedTarget, 0);

    if (result.discoverPending) {
        return result;
    }

    if (result.gameEnded) {
        if (openedTriggerBeat.value) {
            endCurrentBeat(game);
        }
        return result;
    }

    if (openedTriggerBeat.value) {
        endCurrentBeat(game);
    }

    return { gameEnded: false, discoverPending: false };
};
