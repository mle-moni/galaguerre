import { COIN_CARD_ID, type SpellCard } from "./game.types.js";

const COIN_IMAGE_URL =
    "https://static.wikia.nocookie.net/hearthstone_gamepedia/images/8/8e/TheCoin.png";

export const COIN_CARD_PREVIEW: SpellCard = {
    uuid: "coin-preview",
    cardId: COIN_CARD_ID,
    label: "La Pièce",
    imageUrl: COIN_IMAGE_URL,
    cost: 0,
    tags: [],
    type: "SPELL",
    description: "Ce tour-ci, gagnez 1 cristal de mana.",
    spellActions: [
        {
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
    ],
};
