import type {
    ActionTarget,
    BoardState,
    GamePlayer,
    MinionSpotId,
    MinionState,
} from "#api_types/game.types";

export type ResolvedHeroTarget = {
    type: "HERO";
    player: GamePlayer;
};

export type ResolvedMinionTarget = {
    type: "MINION";
    board: BoardState;
    spotId: MinionSpotId;
    minion: MinionState;
};

export type ResolvedTarget = ResolvedHeroTarget | ResolvedMinionTarget;

export const resolveSelectedTarget = (
    selectedTarget: ActionTarget,
    player: GamePlayer,
    opponent: GamePlayer,
): ResolvedTarget | null => {
    if (selectedTarget.spotId === null) {
        const targetPlayer = selectedTarget.owner === "PLAYER" ? player : opponent;
        return { type: "HERO", player: targetPlayer };
    }

    const board = selectedTarget.owner === "PLAYER" ? player.board : opponent.board;
    const minion = board[selectedTarget.spotId];
    if (!minion) return null;

    return {
        type: "MINION",
        board,
        spotId: selectedTarget.spotId,
        minion,
    };
};
