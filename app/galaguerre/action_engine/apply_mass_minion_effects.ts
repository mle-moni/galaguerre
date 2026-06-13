import {
    MINION_SPOT_IDS,
    type BoardState,
    type GamePlayer,
    type MinionState,
    type TargetSnapshot,
} from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import type Game from "#models/game";
import { getActualHeal, recordHealingDone } from "../game_stats/record_player_stats.js";
import { triggerHealPassives } from "../passive_engine/trigger_heal_passives.js";
import { applyDamageToMinion } from "./apply_damage_to_minion.js";
import { applyHeal, getMinionMaxHealth } from "./apply_heal.js";

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
    sourcePlayer: GamePlayer,
    sourceMinion?: MinionState,
): { gameEnded: boolean } => {
    for (const { board, owner, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            const result = applyDamageToMinion(game, owner, spotId, minion, damage, sourcePlayer);
            if (result.gameEnded) return { gameEnded: true };
        }
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
    for (const { board, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            const maxHealth = getMinionMaxHealth(minion);
            const actualHeal = getActualHeal(minion.health, heal, maxHealth);
            minion.health = applyHeal(minion.health, heal, maxHealth);
            recordHealingDone(sourcePlayer, actualHeal);
        }
    }

    return triggerHealPassives(game);
};
