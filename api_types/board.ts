import type { BoardState, GamePlayer, MinionState } from "./game.types.js";

export const MAX_BOARD_MINIONS = 7;

const LEGACY_SPOT_IDS = [
    "SPOT_1",
    "SPOT_2",
    "SPOT_3",
    "SPOT_4",
    "SPOT_5",
    "SPOT_6",
    "SPOT_7",
] as const;

export const createEmptyBoard = (): BoardState => [];

export interface OccupiedBoardEntry {
    boardIndex: number;
    minion: MinionState;
}

export const getOccupiedBoardEntries = (board: BoardState): OccupiedBoardEntry[] => {
    return board.map((minion, boardIndex) => ({ boardIndex, minion }));
};

export const countBoardMinionsOnBoard = (board: BoardState): number => {
    return board.length;
};

export const playerHasBoardSpace = (player: GamePlayer): boolean => {
    return player.board.length < MAX_BOARD_MINIONS;
};

export const findMinionIndex = (board: BoardState, minionUuid: string): number => {
    return board.findIndex((minion) => minion.uuid === minionUuid);
};

export const insertMinionAtIndex = (
    board: BoardState,
    index: number,
    minion: MinionState,
): { inserted: boolean } => {
    if (board.length >= MAX_BOARD_MINIONS) {
        return { inserted: false };
    }

    if (index < 0 || index > board.length) {
        return { inserted: false };
    }

    board.splice(index, 0, minion);

    return { inserted: true };
};

export const removeMinionByUuid = (board: BoardState, minionUuid: string): void => {
    const index = findMinionIndex(board, minionUuid);
    if (index === -1) return;

    board.splice(index, 1);
};

const migrateLegacyBoard = (board: unknown): BoardState => {
    if (Array.isArray(board)) {
        return board;
    }

    if (board === null || typeof board !== "object") {
        return createEmptyBoard();
    }

    const legacyBoard = board as Record<string, MinionState | null | undefined>;
    return LEGACY_SPOT_IDS.map((spotId) => legacyBoard[spotId]).filter(
        (minion): minion is MinionState => minion != null,
    );
};

export const migrateBoardIfNeeded = (board: unknown): { board: BoardState; changed: boolean } => {
    if (Array.isArray(board)) {
        return { board, changed: false };
    }

    const migrated = migrateLegacyBoard(board);
    return { board: migrated, changed: true };
};

export const migrateGameBoards = (playerOne: GamePlayer, playerTwo: GamePlayer): boolean => {
    const migratedPlayerOne = migrateBoardIfNeeded(playerOne.board);
    const migratedPlayerTwo = migrateBoardIfNeeded(playerTwo.board);

    playerOne.board = migratedPlayerOne.board;
    playerTwo.board = migratedPlayerTwo.board;

    return migratedPlayerOne.changed || migratedPlayerTwo.changed;
};

export const getAdjacentMinions = (
    board: BoardState,
    boardIndex: number,
): { left?: MinionState; right?: MinionState } => {
    if (boardIndex < 0 || boardIndex >= board.length) {
        return {};
    }

    return {
        left: boardIndex > 0 ? board[boardIndex - 1] : undefined,
        right: boardIndex < board.length - 1 ? board[boardIndex + 1] : undefined,
    };
};
