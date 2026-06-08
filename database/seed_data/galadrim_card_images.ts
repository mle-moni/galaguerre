import { CARD_HS_IDS } from "./classic_card_hs_ids.js";

const HS_ART_BASE = "https://art.hearthstonejson.com/v1/render/latest/frFR/256x";
const PLACEHOLDER_HS_IDS = Object.values(CARD_HS_IDS);

const hashLabel = (label: string): number => {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    }
    return hash;
};

export const getGaladrimCardImage = (label: string): string => {
    const cardId = PLACEHOLDER_HS_IDS[hashLabel(label) % PLACEHOLDER_HS_IDS.length]!;
    return `${HS_ART_BASE}/${cardId}.png`;
};
