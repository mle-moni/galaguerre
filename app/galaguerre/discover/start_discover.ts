import type { CardActionFieldsSnapshot, GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { beginLoggedBeat, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { generateDiscoverOptions } from "./generate_discover_options.js";
import { generateOpponentDeckDiscoverOptions } from "./generate_opponent_deck_discover_options.js";
import type { ExecuteActionDiscoverContext, ExecuteActionResult } from "./discover_types.js";
import { getOpponentPlayer } from "./discover_types.js";

export const startDiscover = (
    game: Game,
    player: GamePlayer,
    action: Extract<CardActionFieldsSnapshot, { type: "DISCOVER" }>,
    discoverContext: ExecuteActionDiscoverContext,
): ExecuteActionResult => {
    const discoverSource = action.discoverSource ?? "CATALOG";
    const options =
        discoverSource === "OPPONENT_DECK"
            ? generateOpponentDeckDiscoverOptions(
                  getOpponentPlayer(game, player),
                  action.optionCount,
              )
            : generateDiscoverOptions(
                  action.discoverCardFilter,
                  action.optionCount,
                  action.discoverCardFilterAlternatives,
                  player.ownedGoldenCardIds ?? [],
              );

    if (options.length === 0) {
        return "ok";
    }

    const opponent =
        discoverSource === "OPPONENT_DECK" ? getOpponentPlayer(game, player) : undefined;

    game.data.pendingDiscover = {
        playerUserId: player.userId,
        sourceCardId: discoverContext.sourceCard.cardId,
        sourceCardLabel: discoverContext.sourceCard.label,
        sourceCardUuid: discoverContext.sourceCard.uuid,
        options,
        discoverSource,
        enemyDrawsChosenCard: action.enemyDrawsChosenCard ?? false,
        opponentUserId: opponent?.userId,
        continuation: {
            remainingActions: discoverContext.remainingActions,
            context: {
                effectKind: discoverContext.effectKind,
                selectedTarget: discoverContext.selectedTarget,
                damageBonus: discoverContext.damageBonus,
                sourceMinionUuid: discoverContext.sourceMinionUuid,
                battlecryContinuation: discoverContext.battlecryContinuation,
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
