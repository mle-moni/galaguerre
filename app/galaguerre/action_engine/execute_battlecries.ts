import type {
    ActionTarget,
    CardActionSnapshot,
    GamePlayer,
    MinionCard,
} from "#api_types/game.types";
import type Game from "#models/game";
import { recordBattlecry } from "../game_log/record_game_log.js";
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

const recordBattlecryTrigger = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
    openedTriggerBeat: { value: boolean },
): void => {
    recordBattlecry(game, player, card);
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
            trigger: "BATTLECRY",
        });
    });
};

const buildBattlecrySequenceOptions = (
    card: MinionCard,
    player: GamePlayer,
    selectedTarget?: ActionTarget,
    battlecryContinuation?: ExecuteActionSequenceOptions["battlecryContinuation"],
): ExecuteActionSequenceOptions => ({
    sourceCard: { cardId: card.cardId, label: card.label, uuid: card.uuid },
    effectKind: "BATTLECRY",
    selectedTarget,
    sourceMinion: player.board.find((minion) => minion.uuid === card.uuid),
    battlecryContinuation,
});

const runBattlecryActionSequence = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
    actions: CardActionSnapshot[],
    selectedTarget: ActionTarget | undefined,
    remainingFullSequencesAfterThis: number,
): { gameEnded: boolean; discoverPending: boolean } => {
    const opponent = getOpponent(game, player);

    return executeActionSequence(game, player, opponent, actions, {
        ...buildBattlecrySequenceOptions(
            card,
            player,
            selectedTarget,
            remainingFullSequencesAfterThis > 0
                ? { actions, remainingIterations: remainingFullSequencesAfterThis }
                : undefined,
        ),
    });
};

export const runAdditionalBattlecrySequences = (
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
            recordBattlecryTrigger(game, player, card, openedTriggerBeat);
        }

        const remainingFullSequencesAfterThis = sequenceCount - index - 1;
        const result = runBattlecryActionSequence(
            game,
            player,
            card ??
                ({
                    uuid: source.uuid,
                    cardId: source.cardId,
                    label: source.label,
                    battlecryActions: actions,
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

export const executeBattlecries = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
    selectedTarget?: ActionTarget,
): { gameEnded: boolean; discoverPending: boolean } => {
    const actions = card.battlecryActions ?? [];

    const hasValidBattlecry = actions.some(
        (action) => isV1Action(action) || isTargetedV1Action(action),
    );
    if (!hasValidBattlecry) {
        return { gameEnded: false, discoverPending: false };
    }

    const totalIterations = 1 + player.extraBattlecryTriggers;
    const openedTriggerBeat = { value: false };

    for (let iteration = 0; iteration < totalIterations; iteration++) {
        recordBattlecryTrigger(game, player, card, openedTriggerBeat);

        const remainingFullSequencesAfterThis = totalIterations - iteration - 1;
        const result = runBattlecryActionSequence(
            game,
            player,
            card,
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
