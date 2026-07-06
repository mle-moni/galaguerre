import type {
    ActionTarget,
    BoardState,
    GamePlayer,
    MinionState,
    TargetSnapshot,
} from "./game.types.js";
import { getAdjacentMinions } from "./board.js";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "./target_matching.js";

export type AdjacencyContext = {
    sourceMinion?: MinionState;
    selectedTarget?: ActionTarget;
    player: GamePlayer;
    opponent: GamePlayer;
};

export type AdjacencyAnchor = {
    board: BoardState;
    boardIndex: number;
    owner: GamePlayer;
    isOpponent: boolean;
};

const findMinionOnBoard = (
    board: BoardState,
    minionUuid: string,
): { boardIndex: number; minion: MinionState } | null => {
    const boardIndex = board.findIndex((entry) => entry.uuid === minionUuid);
    if (boardIndex === -1) return null;
    const minion = board[boardIndex];
    if (!minion) return null;
    return { boardIndex, minion };
};

export const resolveAdjacencyAnchor = (
    target: TargetSnapshot,
    context: AdjacencyContext,
): AdjacencyAnchor | null => {
    if (!target.adjacency) return null;

    if (target.adjacency === "SOURCE") {
        if (!context.sourceMinion) return null;

        for (const { board, owner, isOpponent } of [
            { board: context.player.board, owner: context.player, isOpponent: false },
            { board: context.opponent.board, owner: context.opponent, isOpponent: true },
        ]) {
            const found = findMinionOnBoard(board, context.sourceMinion.uuid);
            if (found) {
                return { board, boardIndex: found.boardIndex, owner, isOpponent };
            }
        }

        return null;
    }

    if (!context.selectedTarget || context.selectedTarget.minionUuid === null) {
        return null;
    }

    const isOpponent = context.selectedTarget.owner === "OPPONENT";
    const owner = isOpponent ? context.opponent : context.player;
    const found = findMinionOnBoard(owner.board, context.selectedTarget.minionUuid);
    if (!found) return null;

    return {
        board: owner.board,
        boardIndex: found.boardIndex,
        owner,
        isOpponent,
    };
};

export const collectAdjacentMinionTargets = (
    target: TargetSnapshot,
    context: AdjacencyContext,
    sourceMinion?: MinionState,
): { owner: GamePlayer; boardIndex: number; minion: MinionState }[] => {
    const anchor = resolveAdjacencyAnchor(target, context);
    if (!anchor) return [];

    const { left, right } = getAdjacentMinions(anchor.board, anchor.boardIndex);
    const candidates = [
        left ? { boardIndex: anchor.boardIndex - 1, minion: left } : null,
        right ? { boardIndex: anchor.boardIndex + 1, minion: right } : null,
    ].filter((entry): entry is { boardIndex: number; minion: MinionState } => entry !== null);

    const results: { owner: GamePlayer; boardIndex: number; minion: MinionState }[] = [];

    for (const candidate of candidates) {
        if (shouldExcludeSourceMinion(target, sourceMinion, candidate.minion)) continue;
        if (!minionMatchesTarget(candidate.minion, target, anchor.isOpponent)) continue;

        results.push({
            owner: anchor.owner,
            boardIndex: candidate.boardIndex,
            minion: candidate.minion,
        });
    }

    return results;
};
