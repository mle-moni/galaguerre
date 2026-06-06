import type { PlayerCard, PlayerCardBase } from "#api_types/game.types";
import {
    getMinionCardDescription,
    getMinionPowerEffects,
} from "../../galaguerre/minion_card_metadata.js";
import type Deck from "#models/deck";
import { randomUUID } from "node:crypto";
import { shuffleArray } from "../../utils/array.js";

export const generatePlayerCards = (deck: Deck) => {
    const cards: PlayerCard[] = deck.cards.map((card) => {
        const base: PlayerCardBase = {
            uuid: randomUUID(),
            cardId: card.id,
            label: card.label,
            imageUrl: card.imageUrl,
            cost: card.cost,
        };

        if (card.type === "SPELL") throw new Error("card type not supported");
        if (card.type === "WEAPON") throw new Error("card type not supported");

        if (!card.minion) throw new Error("card.minion not found");

        const effects = getMinionPowerEffects(card.minion.minionPower);

        return {
            ...base,
            type: "MINION",
            health: card.minion.health,
            attack: card.minion.attack,
            hasTaunt: card.minion.minionPower?.hasTaunt ?? false,
            effects,
            description: getMinionCardDescription(card.minion.attack, card.minion.health, effects),
        };
    });

    return shuffleArray(cards);
};
