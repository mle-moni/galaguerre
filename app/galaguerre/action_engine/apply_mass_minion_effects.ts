import type { BoardState, GamePlayer, MinionState, TargetSnapshot } from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import type Game from "#models/game";
import { findMinionIndexOnBoard } from "./find_minion_on_board.js";
import { applyDamageToMinion } from "./apply_damage_to_minion.js";
import { applyHealToMinion } from "./apply_heal_with_passives.js";

type BoardEntry = {
    board: BoardState;
    owner: GamePlayer;
    isOpponent: boolean;
};

export type MatchingMinionTarget = {
    owner: GamePlayer;
    boardIndex: number;
    minion: MinionState;
};

export const collectMatchingMinionTargets = (
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    sourceMinion?: MinionState,
): MatchingMinionTarget[] => {
    const results: MatchingMinionTarget[] = [];

    for (const { board, owner, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (let boardIndex = 0; boardIndex < board.length; boardIndex++) {
            const minion = board[boardIndex];
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            results.push({ owner, boardIndex, minion });
        }
    }

    return results;
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
    sourcePlayer: GamePlayer,
    sourceMinion?: MinionState,
): { gameEnded: boolean } => {
    const targets = collectMatchingMinionTargets(player, opponent, target, sourceMinion);

    for (const { owner, minion } of targets) {
        const boardIndex = findMinionIndexOnBoard(owner, minion.uuid);
        if (boardIndex === -1) continue;

        const currentMinion = owner.board[boardIndex];
        if (!currentMinion) continue;

        const result = applyDamageToMinion(
            game,
            owner,
            boardIndex,
            currentMinion,
            damage,
            sourcePlayer,
        );
        if (result.gameEnded) return { gameEnded: true };
    }

    return { gameEnded: false };
};

export const applyHealToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    heal: number,
    sourcePlayer: GamePlayer,
    sourceMinion?: MinionState,
): { gameEnded: boolean } => {
    const targets = collectMatchingMinionTargets(player, opponent, target, sourceMinion);

    for (const { owner, minion } of targets) {
        const boardIndex = findMinionIndexOnBoard(owner, minion.uuid);
        if (boardIndex === -1) continue;

        const currentMinion = owner.board[boardIndex];
        if (!currentMinion) continue;

        const result = applyHealToMinion(
            game,
            owner,
            boardIndex,
            currentMinion,
            heal,
            sourcePlayer,
        );
        if (result.gameEnded) return { gameEnded: true };
    }

    return { gameEnded: false };
};
