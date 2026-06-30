import type { ActionTarget, GamePlayer, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { recordBattlecry } from "../game_log/record_game_log.js";
import { beginLoggedBeatIfNone, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { executeActionSequence } from "./execute_action_sequence.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

export const executeBattlecries = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
    selectedTarget?: ActionTarget,
): { gameEnded: boolean; discoverPending: boolean } => {
    const opponent = getOpponent(game, player);
    const actions = card.battlecryActions ?? [];

    const hasValidBattlecry = actions.some(
        (action) => isV1Action(action) || isTargetedV1Action(action),
    );
    let openedTriggerBeat = false;
    if (hasValidBattlecry) {
        recordBattlecry(game, player, card);
        const owner = resolveSpotOwner(game, player);

        withNarrativeRecorder((recorder) => {
            if (!recorder.hasCurrentBeat()) {
                beginLoggedBeatIfNone(game, "TRIGGER");
                openedTriggerBeat = true;
            }
            recorder.recordEffect({
                type: "TRIGGER",
                cardUuid: card.uuid,
                owner,
                trigger: "BATTLECRY",
            });
        });
    }

    const result = executeActionSequence(game, player, opponent, actions, {
        sourceCard: { cardId: card.cardId, label: card.label, uuid: card.uuid },
        effectKind: "BATTLECRY",
        selectedTarget,
        sourceMinion: player.board.find((minion) => minion.uuid === card.uuid),
    });

    if (openedTriggerBeat && !result.discoverPending) {
        endCurrentBeat(game);
    }

    return result;
};
