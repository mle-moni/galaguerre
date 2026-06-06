import { MINION_SPOT_IDS, type GamePlayer, type MinionState } from "#api_types/game.types";

export const findMinionOnPlayerBoard = (
    player: GamePlayer,
    cardUuid: string,
): MinionState | undefined => {
    for (const spotId of MINION_SPOT_IDS) {
        const minion = player.board[spotId];
        if (minion?.uuid === cardUuid) return minion;
    }

    return undefined;
};
