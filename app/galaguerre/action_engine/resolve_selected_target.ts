import type { ActionTarget, GamePlayer, MinionState } from "#api_types/game.types";
import { findMinionInBoard } from "#controllers/games/game_utils";

export type ResolvedHeroTarget = {
    type: "HERO";
    player: GamePlayer;
};

export type ResolvedMinionTarget = {
    type: "MINION";
    owner: GamePlayer;
    minion: MinionState;
};

export type ResolvedTarget = ResolvedHeroTarget | ResolvedMinionTarget;

export const resolveSelectedTarget = (
    selectedTarget: ActionTarget,
    player: GamePlayer,
    opponent: GamePlayer,
): ResolvedTarget | null => {
    if (selectedTarget.minionUuid === null) {
        const targetPlayer = selectedTarget.owner === "PLAYER" ? player : opponent;
        return { type: "HERO", player: targetPlayer };
    }

    const board = selectedTarget.owner === "PLAYER" ? player.board : opponent.board;
    const minionPosition = findMinionInBoard(
        board,
        selectedTarget.minionUuid,
        selectedTarget.owner,
    );
    if (!minionPosition) return null;

    const owner = selectedTarget.owner === "PLAYER" ? player : opponent;

    return {
        type: "MINION",
        owner,
        minion: minionPosition.minion,
    };
};
