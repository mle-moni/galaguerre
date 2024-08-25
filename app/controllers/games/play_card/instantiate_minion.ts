import type { MinionCard, MinionState } from "#api_types/game.types";

export const instantiateMinion = (card: MinionCard, roundNumber: number): MinionState => {
    return {
        uuid: card.uuid,
        health: card.health,
        attack: card.attack,
        placedAtRound: roundNumber,
        lastActionAtRound: 0,
        originalCard: {
            ...card,
        },
    };
};
