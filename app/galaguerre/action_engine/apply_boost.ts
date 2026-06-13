import {
    MINION_SPOT_IDS,
    type BoardState,
    type BoostSnapshot,
    type GamePlayer,
    type MinionState,
    type TargetSnapshot,
} from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";

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

        card.effects = getMinionPowerEffects(card.minionPowers);
    }
};

export const applyBoostToHero = (player: GamePlayer, boost: BoostSnapshot): void => {
    if (boost.spellPower !== null) {
        player.spellPower += boost.spellPower;
    }
};

export const applyBoostToAllMinions = (
    board: BoardState,
    target: TargetSnapshot,
    boost: BoostSnapshot,
    isOpponentMinion: boolean,
    sourceMinion?: MinionState,
): void => {
    for (const spotId of MINION_SPOT_IDS) {
        const minion = board[spotId];
        if (!minion) continue;
        if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
        if (!minionMatchesTarget(minion, target, isOpponentMinion)) continue;
        applyBoostToMinion(minion, boost);
    }
};
