import {
    countBoardMinionsOnBoard,
    insertMinionAtIndex,
    playerHasBoardSpace,
    removeMinionByUuid,
} from "#api_types/board";
import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { findMinionIndexOnBoard } from "./find_minion_on_board.js";
import {
    removeMinionFromAuraTracking,
    revertAurasReceivedByMinion,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";
import { refreshAurasAfterMinionPlayed } from "../passive_engine/refresh_passive_auras.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";

export { playerHasBoardSpace } from "#api_types/board";

export const canMindControlWithBoardSpace = (controller: GamePlayer): boolean => {
    return playerHasBoardSpace(controller);
};

export const canMindControlTarget = (
    controller: GamePlayer,
    sourceOwner: GamePlayer,
    minionUuid: string,
): boolean => {
    if (!playerHasBoardSpace(controller)) return false;

    return findMinionIndexOnBoard(sourceOwner, minionUuid) !== -1;
};

export const applyMindControlToMinion = (
    game: Game,
    controller: GamePlayer,
    sourceOwner: GamePlayer,
    sourceBoardIndex: number,
): boolean => {
    if (!playerHasBoardSpace(controller)) return false;

    const minion = sourceOwner.board[sourceBoardIndex];
    if (!minion) return false;

    revertPassiveAurasForSource(game, sourceOwner, minion);
    revertAurasReceivedByMinion(game, minion);
    removeMinionFromAuraTracking(game, minion);

    removeMinionByUuid(sourceOwner.board, minion.uuid);

    const boardIndex = countBoardMinionsOnBoard(controller.board);
    const { inserted } = insertMinionAtIndex(controller.board, boardIndex, minion);
    if (!inserted) return false;

    refreshAurasAfterMinionPlayed(game, controller, boardIndex);

    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({
            type: "MIND_CONTROL",
            cardUuid: minion.uuid,
            fromOwner: resolveSpotOwner(game, sourceOwner),
            toOwner: resolveSpotOwner(game, controller),
            boardIndex,
        });
    });

    return true;
};
