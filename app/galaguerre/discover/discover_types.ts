import type {
    ActionTarget,
    CardActionSnapshot,
    DiscoverEffectKind,
    GamePlayer,
} from "#api_types/game.types";

export type ExecuteActionResult = "ok" | "discover_pending";

export interface ExecuteActionDiscoverContext {
    sourceCard: { cardId: number; label: string; uuid: string };
    effectKind: DiscoverEffectKind;
    remainingActions: CardActionSnapshot[];
    selectedTarget?: ActionTarget;
    damageBonus: number;
    sourceMinionUuid?: string;
}

export interface ExecuteActionOptions {
    discoverContext?: ExecuteActionDiscoverContext;
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
