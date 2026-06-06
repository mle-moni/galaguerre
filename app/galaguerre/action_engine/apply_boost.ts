import {
    MINION_SPOT_IDS,
    type BoardState,
    type BoostSnapshot,
    type GamePlayer,
    type MinionState,
    type TargetSnapshot,
} from "#api_types/game.types";
import { minionMatchesTarget } from "#api_types/target_matching";

export const applyBoostToMinion = (minion: MinionState, boost: BoostSnapshot): void => {
    if (boost.attack !== null) {
        minion.attack += boost.attack;
    }

    if (boost.health !== null) {
        minion.health += boost.health;
        minion.maxHealth += boost.health;
    }

    if (boost.minionPower && minion.originalCard.type === "MINION") {
        const card = minion.originalCard;
        minion.permanentKeywords ??= {
            hasTaunt: false,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: false,
        };

        if (boost.minionPower.hasTaunt) {
            card.hasTaunt = true;
            minion.permanentKeywords.hasTaunt = true;
        }
        if (boost.minionPower.hasCharge) {
            card.hasCharge = true;
            minion.permanentKeywords.hasCharge = true;
        }
        if (boost.minionPower.hasWindfury) {
            card.hasWindfury = true;
            minion.permanentKeywords.hasWindfury = true;
        }
        if (boost.minionPower.isPoisonous) {
            card.isPoisonous = true;
            minion.permanentKeywords.isPoisonous = true;
        }

        const effects: string[] = [];
        if (card.hasTaunt) effects.push("Provocation");
        if (card.hasCharge) effects.push("Charge");
        if (card.hasWindfury) effects.push("Furie des vents");
        if (card.isPoisonous) effects.push("Toxique");
        card.effects = effects;
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
): void => {
    for (const spotId of MINION_SPOT_IDS) {
        const minion = board[spotId];
        if (!minion) continue;
        if (!minionMatchesTarget(minion, target, isOpponentMinion)) continue;
        applyBoostToMinion(minion, boost);
    }
};
