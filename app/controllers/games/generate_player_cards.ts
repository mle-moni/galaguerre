import type { PlayerCard, PlayerCardBase } from "#api_types/game.types";
import type Deck from "#models/deck";
import { cuid } from "@adonisjs/core/helpers";
import { shuffleArray } from "../../utils/array.js";

export const generatePlayerCards = (deck: Deck) => {
    const cards: PlayerCard[] = deck.cards.map((card) => {
        const base: PlayerCardBase = {
            uuid: cuid(),
            cardId: card.id,
            label: card.label,
            imageUrl: card.imageUrl,
            cost: card.cost,
        };

        if (card.type === "SPELL") throw new Error("card type not supported");
        if (card.type === "WEAPON") throw new Error("card type not supported");

        if (!card.minion) throw new Error("card.minion not found");

        return {
            ...base,
            type: "MINION",
            health: card.minion.health,
            attack: card.minion.attack,
        };
    });

    return shuffleArray(cards);
};
