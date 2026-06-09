import { COIN_CARD_PREVIEW } from "#api_types/coin";
import { COIN_CARD_ID } from "#api_types/game.types";
import { randomUUID } from "node:crypto";

export const createCoinCard = () => ({
    ...COIN_CARD_PREVIEW,
    uuid: randomUUID(),
});

export const isCoinCard = (card: { cardId: number }): boolean => card.cardId === COIN_CARD_ID;
