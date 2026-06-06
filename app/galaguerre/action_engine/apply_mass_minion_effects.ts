import { MINION_SPOT_IDS, type GamePlayer, type TargetSnapshot } from "#api_types/game.types";
import { minionMatchesTarget } from "#api_types/target_matching";
import type Game from "#models/game";
import { applyHeal, getMinionMaxHealth } from "./apply_heal.js";
import { killMinion } from "./kill_minion.js";

export const applyDamageToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    damage: number,
): { gameEnded: boolean } => {
    const isOpponentMinion = target.targetTeam === "OPPONENT";
    const owner = isOpponentMinion ? opponent : player;
    const board = owner.board;

    for (const spotId of MINION_SPOT_IDS) {
        const minion = board[spotId];
        if (!minion) continue;
        if (!minionMatchesTarget(minion, target, isOpponentMinion)) continue;

        minion.health -= damage;
        if (minion.health <= 0) {
            const result = killMinion(game, owner, spotId);
            if (result.gameEnded) return { gameEnded: true };
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
    const isOpponentMinion = target.targetTeam === "OPPONENT";
    const board = isOpponentMinion ? opponent.board : player.board;

    for (const spotId of MINION_SPOT_IDS) {
        const minion = board[spotId];
        if (!minion) continue;
        if (!minionMatchesTarget(minion, target, isOpponentMinion)) continue;

        minion.health = applyHeal(minion.health, heal, getMinionMaxHealth(minion));
    }
};
