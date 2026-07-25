import type {
    ActionTarget,
    CardActionSnapshot,
    DiscoverEffectKind,
    GamePlayer,
} from "#api_types/game.types";
import type { PassiveTriggerEvent } from "#api_types/target_matching";

export type ExecuteActionResult = "ok" | "discover_pending";

export interface ExecuteActionDiscoverContext {
    sourceCard: { cardId: number; label: string; uuid: string };
    effectKind: DiscoverEffectKind;
    remainingActions: CardActionSnapshot[];
    selectedTarget?: ActionTarget;
    damageBonus: number;
    sourceMinionUuid?: string;
    battlecryContinuation?: {
        actions: CardActionSnapshot[];
        remainingIterations: number;
    };
}

export interface ExecuteActionOptions {
    discoverContext?: ExecuteActionDiscoverContext;
    deckCardAddEvent?: PassiveTriggerEvent;
}

export const findPlayerByUserId = (
    game: { data: { playerOne: GamePlayer; playerTwo: GamePlayer } },
    userId: number,
): GamePlayer | undefined => {
    const { playerOne, playerTwo } = game.data;
    if (playerOne.userId === userId) return playerOne;
    if (playerTwo.userId === userId) return playerTwo;
    return undefined;
};

export const getOpponentPlayer = (
    game: { data: { playerOne: GamePlayer; playerTwo: GamePlayer } },
    player: GamePlayer,
): GamePlayer => (player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne);
