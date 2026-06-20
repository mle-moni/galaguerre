import { findMinionIndex } from "#api_types/board";
import type { GamePlayer, MinionState } from "#api_types/game.types";

export const findMinionIndexOnBoard = (player: GamePlayer, minionUuid: string): number => {
    return findMinionIndex(player.board, minionUuid);
};

export const requireMinionIndex = (owner: GamePlayer, minion: MinionState): number =>
    findMinionIndexOnBoard(owner, minion.uuid);

export const findMinionOnPlayerBoard = (
    player: GamePlayer,
    cardUuid: string,
): MinionState | undefined => {
    return player.board.find((minion) => minion.uuid === cardUuid);
};
