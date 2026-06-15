import {
    MINION_SPOT_IDS,
    type GamePlayer,
    type MinionSpotId,
    type MinionState,
    type TargetSnapshot,
} from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import type Game from "#models/game";
import { getTargetBoardEntries } from "./apply_mass_minion_effects.js";
import { killMinion } from "./kill_minion.js";

export const applyDestroyToMinion = (
    game: Game,
    owner: GamePlayer,
    spotId: MinionSpotId,
): { gameEnded: boolean } => {
    return killMinion(game, owner, spotId);
};

export const applyDestroyToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    sourceMinion?: MinionState,
): { gameEnded: boolean } => {
    for (const { board, owner, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            const { gameEnded } = killMinion(game, owner, spotId);
            if (gameEnded) return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
