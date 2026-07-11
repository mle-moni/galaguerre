import type {
    ActionTarget,
    CardActionSnapshot,
    DiscoverEffectKind,
    GamePlayer,
    MinionState,
} from "#api_types/game.types";
import type Game from "#models/game";
import { executeAction } from "./execute_action.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";
import type { ExecuteActionResult } from "../discover/discover_types.js";

const isGameOver = (game: Game): boolean =>
    game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;

export interface ExecuteActionSequenceOptions {
    sourceCard: { cardId: number; label: string; uuid: string };
    effectKind: DiscoverEffectKind;
    selectedTarget?: ActionTarget;
    damageBonus?: number;
    sourceMinion?: MinionState;
    battlecryContinuation?: {
        actions: CardActionSnapshot[];
        remainingIterations: number;
    };
}

export const executeActionSequence = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    actions: CardActionSnapshot[],
    options: ExecuteActionSequenceOptions,
): { gameEnded: boolean; discoverPending: boolean } => {
    const damageBonus = options.damageBonus ?? 0;

    for (let index = 0; index < actions.length; index++) {
        const action = actions[index]!;
        if (!isV1Action(action) && !isTargetedV1Action(action)) continue;

        const result: ExecuteActionResult = executeAction(
            action,
            game,
            player,
            opponent,
            options.selectedTarget,
            damageBonus,
            options.sourceMinion,
            {
                discoverContext: {
                    sourceCard: options.sourceCard,
                    effectKind: options.effectKind,
                    remainingActions: actions.slice(index + 1),
                    selectedTarget: options.selectedTarget,
                    damageBonus,
                    sourceMinionUuid: options.sourceMinion?.uuid,
                    battlecryContinuation: options.battlecryContinuation,
                },
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

export const hasPendingDiscover = (game: Game): boolean => game.data.pendingDiscover !== undefined;
