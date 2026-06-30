import type { CardActionFieldsSnapshot, GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { beginLoggedBeat, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { generateDiscoverOptions } from "./generate_discover_options.js";
import type { ExecuteActionDiscoverContext, ExecuteActionResult } from "./discover_types.js";

export const startDiscover = (
    game: Game,
    player: GamePlayer,
    action: Extract<CardActionFieldsSnapshot, { type: "DISCOVER" }>,
    discoverContext: ExecuteActionDiscoverContext,
): ExecuteActionResult => {
    const options = generateDiscoverOptions(action.discoverCardFilter, action.optionCount);

    if (options.length === 0) {
        return "ok";
    }

    game.data.pendingDiscover = {
        playerUserId: player.userId,
        sourceCardId: discoverContext.sourceCard.cardId,
        sourceCardLabel: discoverContext.sourceCard.label,
        sourceCardUuid: discoverContext.sourceCard.uuid,
        options,
        continuation: {
            remainingActions: discoverContext.remainingActions,
            context: {
                effectKind: discoverContext.effectKind,
                selectedTarget: discoverContext.selectedTarget,
                damageBonus: discoverContext.damageBonus,
                sourceMinionUuid: discoverContext.sourceMinionUuid,
            },
        },
    };

    const owner = resolveSpotOwner(game, player);
    withNarrativeRecorder((recorder) => {
        beginLoggedBeat(game, "TRIGGER");
        recorder.recordEffect({
            type: "DISCOVER_START",
            owner,
            optionUuids: options.map((option) => option.uuid),
        });
        endCurrentBeat(game);
    });

    return "discover_pending";
};
