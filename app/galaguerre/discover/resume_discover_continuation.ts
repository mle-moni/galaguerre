import type { CardActionSnapshot, DiscoverContinuation, GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { executeAction } from "../action_engine/execute_action.js";
import { findMinionOnPlayerBoard } from "../action_engine/find_minion_on_board.js";
import { isTargetedV1Action } from "../action_engine/is_targeted_v1_action.js";
import { isV1Action } from "../action_engine/is_v1_action.js";
import type { ExecuteActionDiscoverContext, ExecuteActionResult } from "./discover_types.js";
import { getOpponentPlayer } from "./discover_types.js";

const isGameOver = (game: Game): boolean =>
    game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;

const buildDiscoverContextFromContinuation = (
    continuation: DiscoverContinuation,
    source: { cardId: number; label: string; uuid: string },
    actions: CardActionSnapshot[],
    index: number,
    sourceMinionUuid?: string,
): ExecuteActionDiscoverContext => ({
    sourceCard: source,
    effectKind: continuation.context.effectKind,
    remainingActions: actions.slice(index + 1),
    selectedTarget: continuation.context.selectedTarget,
    damageBonus: continuation.context.damageBonus,
    sourceMinionUuid,
});

export const resumeDiscoverContinuation = (
    game: Game,
    player: GamePlayer,
    continuation: DiscoverContinuation,
    source: { cardId: number; label: string; uuid: string },
): { gameEnded: boolean; discoverPending: boolean } => {
    const opponent = getOpponentPlayer(game, player);
    const { remainingActions, context } = continuation;
    const sourceMinion = context.sourceMinionUuid
        ? findMinionOnPlayerBoard(player, context.sourceMinionUuid)
        : undefined;

    for (let index = 0; index < remainingActions.length; index++) {
        const action = remainingActions[index]!;
        if (!isV1Action(action) && !isTargetedV1Action(action)) continue;

        const result: ExecuteActionResult = executeAction(
            action,
            game,
            player,
            opponent,
            context.selectedTarget,
            context.damageBonus,
            sourceMinion,
            {
                discoverContext: buildDiscoverContextFromContinuation(
                    continuation,
                    source,
                    remainingActions,
                    index,
                    sourceMinion?.uuid,
                ),
            },
        );

        if (result === "discover_pending") {
            return { gameEnded: false, discoverPending: true };
        }

        if (isGameOver(game)) {
            return { gameEnded: true, discoverPending: false };
        }
    }

    return { gameEnded: false, discoverPending: false };
};
