import {
    MINION_SPOT_IDS,
    type ActionTarget,
    type BoardState,
    type GamePlayer,
    type MinionSpotId,
} from "#api_types/game.types";
import type Game from "#models/game";
import {
    removeMinionFromAuraTracking,
    revertAurasReceivedByMinion,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";
import { refreshAurasAfterMinionPlayed } from "../passive_engine/refresh_passive_auras.js";

export const findFirstEmptyBoardSpot = (board: BoardState): MinionSpotId | null => {
    for (const spotId of MINION_SPOT_IDS) {
        if (board[spotId] === null) return spotId;
    }

    return null;
};

export const playerHasBoardSpace = (player: GamePlayer): boolean => {
    return findFirstEmptyBoardSpot(player.board) !== null;
};

export const canMindControlWithBoardSpace = (controller: GamePlayer): boolean => {
    return playerHasBoardSpace(controller);
};

export const canMindControlTarget = (
    controller: GamePlayer,
    sourceOwner: GamePlayer,
    sourceSpotId: NonNullable<ActionTarget["spotId"]>,
): boolean => {
    if (!playerHasBoardSpace(controller)) return false;

    return sourceOwner.board[sourceSpotId] !== null;
};

export const applyMindControlToMinion = (
    game: Game,
    controller: GamePlayer,
    sourceOwner: GamePlayer,
    sourceSpotId: MinionSpotId,
): boolean => {
    const destinationSpotId = findFirstEmptyBoardSpot(controller.board);
    if (!destinationSpotId) return false;

    const minion = sourceOwner.board[sourceSpotId];
    if (!minion) return false;

    revertPassiveAurasForSource(game, sourceOwner, minion);
    revertAurasReceivedByMinion(game, minion);
    removeMinionFromAuraTracking(game, minion);

    sourceOwner.board[sourceSpotId] = null;
    controller.board[destinationSpotId] = minion;

    refreshAurasAfterMinionPlayed(game, controller, destinationSpotId);

    return true;
};
