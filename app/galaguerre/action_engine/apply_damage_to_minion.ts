import type { GamePlayer, MinionSpotId, MinionState } from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type Game from "#models/game";
import { getActualDamage, recordDamageDealt } from "../game_stats/record_player_stats.js";
import { killMinion } from "./kill_minion.js";

export type MinionDamageResult = {
    damageDealt: number;
    killed: boolean;
    gameEnded: boolean;
};

export const getMinionHasDivineShield = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    if (minion.divineShieldConsumed) return false;
    return minion.originalCard.minionPowers?.hasDivineShield ?? false;
};

export const popDivineShield = (minion: MinionState): void => {
    if (minion.originalCard.type !== "MINION") return;

    minion.divineShieldConsumed = true;
    minion.originalCard.minionPowers.hasDivineShield = false;
    minion.originalCard.effects = getMinionPowerEffects(minion.originalCard.minionPowers);
};

export const applyDamageToMinion = (
    game: Game,
    owner: GamePlayer,
    spotId: MinionSpotId,
    minion: MinionState,
    damage: number,
    sourcePlayer: GamePlayer,
): MinionDamageResult => {
    if (getMinionHasDivineShield(minion)) {
        popDivineShield(minion);
        return { damageDealt: 0, killed: false, gameEnded: false };
    }

    const damageDealt = getActualDamage(minion.health, damage);
    minion.health -= damage;
    recordDamageDealt(sourcePlayer, damageDealt);

    if (minion.health <= 0) {
        const { gameEnded } = killMinion(game, owner, spotId);
        return { damageDealt, killed: true, gameEnded };
    }

    return { damageDealt, killed: false, gameEnded: false };
};

export const applyPoisonousToMinion = (
    game: Game,
    owner: GamePlayer,
    spotId: MinionSpotId,
    minion: MinionState,
    sourcePlayer: GamePlayer,
): MinionDamageResult => {
    if (getMinionHasDivineShield(minion)) {
        popDivineShield(minion);
        return { damageDealt: 0, killed: false, gameEnded: false };
    }

    const damageDealt = minion.health;
    minion.health = 0;
    recordDamageDealt(sourcePlayer, damageDealt);

    const { gameEnded } = killMinion(game, owner, spotId);
    return { damageDealt, killed: true, gameEnded };
};
