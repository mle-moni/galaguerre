import type { MinionCard, MinionState } from "#api_types/game.types";

export const instantiateMinion = (card: MinionCard, roundNumber: number): MinionState => {
    return {
        uuid: card.uuid,
        health: card.health,
        attack: card.attack,
        maxHealth: card.health,
        placedAtRound: roundNumber,
        lastActionAtRound: 0,
        attacksThisRound: 0,
        initialKeywords: {
            hasTaunt: card.hasTaunt,
            hasCharge: card.hasCharge,
            hasWindfury: card.hasWindfury,
            isPoisonous: card.isPoisonous,
        },
        permanentKeywords: {
            hasTaunt: false,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: false,
        },
        originalCard: {
            ...card,
        },
    };
};
