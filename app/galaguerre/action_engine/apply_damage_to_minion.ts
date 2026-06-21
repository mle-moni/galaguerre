import type { GamePlayer, MinionState, SpotOwner } from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type Game from "#models/game";
import { getActualDamage, recordDamageDealt } from "../game_stats/record_player_stats.js";
import {
    minionEntityRef,
    recordStatChange,
    resolveSpotOwner,
} from "../game_narrative/narrative_effects.js";
import { triggerDamagePassives } from "../passive_engine/trigger_damage_passives.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { killMinion } from "./kill_minion.js";

export type PoisonousSource = {
    cardUuid: string;
    owner: SpotOwner;
};

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

export const popStealth = (minion: MinionState): void => {
    if (minion.originalCard.type !== "MINION") return;
    if (!minion.originalCard.minionPowers.hasStealth) return;

    minion.originalCard.minionPowers.hasStealth = false;
    minion.originalCard.effects = getMinionPowerEffects(minion.originalCard.minionPowers);
};

export const applyDamageToMinion = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
    minion: MinionState,
    damage: number,
    sourcePlayer: GamePlayer,
    options?: { skipNarrative?: boolean },
): MinionDamageResult => {
    if (damage <= 0) {
        return { damageDealt: 0, killed: false, gameEnded: false };
    }

    if (getMinionHasDivineShield(minion)) {
        popDivineShield(minion);
        return { damageDealt: 0, killed: false, gameEnded: false };
    }

    const damageDealt = getActualDamage(minion.health, damage);
    minion.health -= damage;
    recordDamageDealt(sourcePlayer, damageDealt);
    if (!options?.skipNarrative) {
        recordStatChange(minionEntityRef(minion, resolveSpotOwner(game, owner)), {
            healthDelta: -damageDealt,
        });
    }

    if (damageDealt > 0) {
        const passiveResult = triggerDamagePassives(game, {
            type: "MINION",
            owner,
            boardIndex,
            minion,
        });
        if (passiveResult.gameEnded) {
            return { damageDealt, killed: false, gameEnded: true };
        }
    }

    if (minion.health <= 0) {
        const { gameEnded } = killMinion(game, owner, minion.uuid);
        return { damageDealt, killed: true, gameEnded };
    }

    return { damageDealt, killed: false, gameEnded: false };
};

export const applyPoisonousToMinion = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
    minion: MinionState,
    sourcePlayer: GamePlayer,
    poisonousSource: PoisonousSource,
): MinionDamageResult => {
    if (getMinionHasDivineShield(minion)) {
        popDivineShield(minion);
        return { damageDealt: 0, killed: false, gameEnded: false };
    }

    const damageDealt = minion.health;
    minion.health = 0;
    recordDamageDealt(sourcePlayer, damageDealt);

    if (damageDealt > 0) {
        const passiveResult = triggerDamagePassives(game, {
            type: "MINION",
            owner,
            boardIndex,
            minion,
        });
        if (passiveResult.gameEnded) {
            return { damageDealt, killed: false, gameEnded: true };
        }
    }

    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({
            type: "TRIGGER",
            cardUuid: poisonousSource.cardUuid,
            owner: poisonousSource.owner,
            trigger: "POISONOUS",
        });
    });

    const { gameEnded } = killMinion(game, owner, minion.uuid);
    return { damageDealt, killed: true, gameEnded };
};
