import type { BoostSnapshot, GamePlayer, MinionState, TargetSnapshot } from "#api_types/game.types";
import type { AdjacencyContext } from "#api_types/adjacent_targeting";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type Game from "#models/game";
import { collectMatchingMinionTargets } from "./apply_mass_minion_effects.js";
import {
    minionEntityRef,
    recordStatChange,
    resolveSpotOwner,
} from "../game_narrative/narrative_effects.js";

export type ApplyBoostNarrativeContext = {
    game: Game;
    owner: GamePlayer;
};

export const applyBoostToMinion = (
    minion: MinionState,
    boost: BoostSnapshot,
    narrative?: ApplyBoostNarrativeContext,
): void => {
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
            hasRush: false,
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
        if (boost.minionPowers.hasRush) {
            card.minionPowers.hasRush = true;
            minion.permanentKeywords.hasRush = true;
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
            minion.stealthConsumed = false;
        }
        if (boost.minionPowers.hasDivineShield) {
            card.minionPowers.hasDivineShield = true;
            minion.permanentKeywords.hasDivineShield = true;
            minion.divineShieldConsumed = false;
        }

        card.effects = getMinionPowerEffects(card.minionPowers);
    }

    if (!narrative) return;

    const attackDelta = boost.attack !== null && boost.attack !== 0 ? boost.attack : undefined;
    const healthDelta = boost.health !== null && boost.health !== 0 ? boost.health : undefined;
    if (attackDelta === undefined && healthDelta === undefined) return;

    recordStatChange(minionEntityRef(minion, resolveSpotOwner(narrative.game, narrative.owner)), {
        attackDelta,
        healthDelta,
    });
};

export const applyBoostToHero = (player: GamePlayer, boost: BoostSnapshot): void => {
    if (boost.spellPower !== null) {
        player.spellPower += boost.spellPower;
    }
    if (boost.extraBattlecryTriggers !== null) {
        player.extraBattlecryTriggers += boost.extraBattlecryTriggers;
    }
};

export const applyBoostToAllMinions = (
    game: Game,
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

    for (const { owner, minion } of targets) {
        applyBoostToMinion(minion, boost, { game, owner });
    }
};
