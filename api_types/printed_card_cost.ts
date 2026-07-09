import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";

const PRINTED_MINION_COST_BY_CARD_ID = new Map(
    GALADRIM_CARDS.filter((entry) => entry.data.type === "MINION").map((entry) => [
        entry.id,
        entry.data.cost,
    ]),
);

export const getPrintedCardCost = (cardId: number, fallback: number): number =>
    PRINTED_MINION_COST_BY_CARD_ID.get(cardId) ?? fallback;
