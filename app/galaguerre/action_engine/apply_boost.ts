import type { BoostSnapshot, GamePlayer, MinionState, TargetSnapshot } from "#api_types/game.types";
import type { AdjacencyContext } from "#api_types/adjacent_targeting";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import { collectMatchingMinionTargets } from "./apply_mass_minion_effects.js";

export const applyBoostToMinion = (minion: MinionState, boost: BoostSnapshot): void => {
    if (boost.attack !== null) {
        minion.attack += boost.attack;
    }

    if (boost.health !== null) {
        minion.health += boost.health;
        minion.maxHealth += boost.health;
    }

    if (boost.minionPowers && minion.originalCard.type === "MINION") {
        const card = minion.originalCard;
        minion.permanentKeywords ??= {
            hasTaunt: false,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        };

        if (boost.minionPowers.hasTaunt) {
            card.minionPowers.hasTaunt = true;
            minion.permanentKeywords.hasTaunt = true;
        }
        if (boost.minionPowers.hasCharge) {
            card.minionPowers.hasCharge = true;
            minion.permanentKeywords.hasCharge = true;
        }
        if (boost.minionPowers.hasWindfury) {
            card.minionPowers.hasWindfury = true;
            minion.permanentKeywords.hasWindfury = true;
        }
        if (boost.minionPowers.isPoisonous) {
            card.minionPowers.isPoisonous = true;
            minion.permanentKeywords.isPoisonous = true;
        }
        if (boost.minionPowers.hasStealth) {
            card.minionPowers.hasStealth = true;
            minion.permanentKeywords.hasStealth = true;
        }
        if (boost.minionPowers.hasDivineShield) {
            card.minionPowers.hasDivineShield = true;
            minion.permanentKeywords.hasDivineShield = true;
            minion.divineShieldConsumed = false;
        }

        card.effects = getMinionPowerEffects(card.minionPowers);
    }
};

export const applyBoostToHero = (player: GamePlayer, boost: BoostSnapshot): void => {
    if (boost.spellPower !== null) {
        player.spellPower += boost.spellPower;
    }
};

export const applyBoostToAllMinions = (
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    boost: BoostSnapshot,
    sourceMinion?: MinionState,
    adjacencyContext?: AdjacencyContext,
): void => {
    const targets = collectMatchingMinionTargets(
        player,
        opponent,
        target,
        sourceMinion,
        adjacencyContext,
    );

    for (const { minion } of targets) {
        applyBoostToMinion(minion, boost);
    }
};
