import { CARD_HS_IDS } from "./classic_card_hs_ids.js";

const HS_ART_BASE = "https://art.hearthstonejson.com/v1/render/latest/frFR/256x";

export const getClassicCardImage = (label: string): string => {
    const cardId = CARD_HS_IDS[label];
    if (!cardId) {
        throw new Error(`ID Hearthstone manquant pour: ${label}`);
    }
    return `${HS_ART_BASE}/${cardId}.png`;
};
