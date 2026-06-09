import { COIN_CARD_ID, type SpellCard } from "#api_types/game.types";
import { randomUUID } from "node:crypto";

const COIN_IMAGE_URL =
    "https://static.wikia.nocookie.net/hearthstone_gamepedia/images/8/8e/TheCoin.png";

export const createCoinCard = (): SpellCard => ({
    uuid: randomUUID(),
    cardId: COIN_CARD_ID,
    label: "La Pièce",
    imageUrl: COIN_IMAGE_URL,
    cost: 0,
    tagIds: [],
    type: "SPELL",
    description: "Ce tour-ci, gagnez 1 cristal de mana.",
    action: {
        type: "DRAW",
        isTargeted: false,
        damage: null,
        heal: null,
        drawCount: null,
        enemyDrawCount: null,
        drawCardFilter: null,
        enemyDrawCardFilter: null,
        boost: null,
        target: null,
    },
});

export const isCoinCard = (card: { cardId: number }): boolean => card.cardId === COIN_CARD_ID;
