import type { MinionCard, MinionState } from "#api_types/game.types";
import { clearHandCostReduction } from "../../../galaguerre/dynamic_cost/compute_effective_cost.js";
import {
    getMinionPowerEffects,
    normalizeMinionPowers,
} from "../../../galaguerre/minion_card_metadata.js";

export const instantiateMinion = (card: MinionCard, roundNumber: number): MinionState => {
    const minionPowers = normalizeMinionPowers(card.minionPowers);
    const boardCard = clearHandCostReduction({ ...card });

    return {
        uuid: card.uuid,
        health: card.health,
        attack: card.attack,
        maxHealth: card.health,
        placedAtRound: roundNumber,
        lastActionAtRound: 0,
        attacksThisRound: 0,
        divineShieldConsumed: false,
        stealthConsumed: false,
        initialKeywords: {
            hasTaunt: minionPowers.hasTaunt,
            hasCharge: minionPowers.hasCharge,
            hasRush: minionPowers.hasRush,
            hasWindfury: minionPowers.hasWindfury,
            isPoisonous: minionPowers.isPoisonous,
            hasStealth: minionPowers.hasStealth,
            hasDivineShield: minionPowers.hasDivineShield,
        },
        permanentKeywords: {
            hasTaunt: false,
            hasCharge: false,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
        originalCard: {
            ...boardCard,
            minionPowers,
            effects: getMinionPowerEffects(minionPowers),
        },
        isSilenced: false,
    };
};
