import {
    MINION_SPOT_IDS,
    type BoardState,
    type GamePlayer,
    type TargetSnapshot,
} from "#api_types/game.types";
import { minionMatchesTarget } from "#api_types/target_matching";
import type Game from "#models/game";
import { applyHeal, getMinionMaxHealth } from "./apply_heal.js";
import { killMinion } from "./kill_minion.js";

type BoardEntry = {
    board: BoardState;
    owner: GamePlayer;
    isOpponent: boolean;
};

export const getTargetBoardEntries = (
    target: TargetSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
): BoardEntry[] => {
    if (target.targetTeam === "ALL") {
        return [
            { board: player.board, owner: player, isOpponent: false },
            { board: opponent.board, owner: opponent, isOpponent: true },
        ];
    }

    const isOpponent = target.targetTeam === "OPPONENT";
    const owner = isOpponent ? opponent : player;
    return [{ board: owner.board, owner, isOpponent }];
};

export const applyDamageToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    damage: number,
): { gameEnded: boolean } => {
    for (const { board, owner, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            minion.health -= damage;
            if (minion.health <= 0) {
                const result = killMinion(game, owner, spotId);
                if (result.gameEnded) return { gameEnded: true };
            }
        }
    }

    return { gameEnded: false };
};

export const applyHealToAllMinions = (
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    heal: number,
): void => {
    for (const { board, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            minion.health = applyHeal(minion.health, heal, getMinionMaxHealth(minion));
        }
    }
};
