import type { CardRarity } from "./card_rarity.types.js";
import { getGoldCoinsPerDuplicateSell } from "./card_rarity.types.js";
import type { ApiCatalogCard } from "./deck.types.js";
import { GALADRIM_AGGRO_DECK_RECIPE } from "../database/seed_data/balanced_decks.js";

export const COLLECTION_MAX_COPIES_PER_CARD = 2;
export const PACK_SIZE = 5;

export const GOLD_COINS_PER_COMMON_CARD_BUY = 50;
export const GOLD_COINS_PER_RARE_CARD_BUY = 175;
export const GOLD_COINS_PER_EPIC_CARD_BUY = 250;
export const GOLD_COINS_PER_LEGENDARY_CARD_BUY = 500;
export const GOLD_COINS_PER_DUPLICATE_COMMON_SELL = getGoldCoinsPerDuplicateSell("COMMON");
export const GOLD_COINS_PER_DUPLICATE_RARE_SELL = getGoldCoinsPerDuplicateSell("RARE");
export const GOLD_COINS_PER_DUPLICATE_EPIC_SELL = getGoldCoinsPerDuplicateSell("EPIC");
export const GOLD_COINS_PER_DUPLICATE_LEGENDARY_SELL = getGoldCoinsPerDuplicateSell("LEGENDARY");

export const STARTER_COLLECTION_RECIPE = GALADRIM_AGGRO_DECK_RECIPE;

export interface ApiCollectionEntry {
    cardId: number;
    count: number;
}

export interface ApiCollectionResponse {
    entries: ApiCollectionEntry[];
}

export interface ApiPacksResponse {
    unopenedCount: number;
}

export interface ApiOpenPackResponse {
    cards: ApiCatalogCard[];
}

export interface ApiDuplicateSellLine {
    cardId: number;
    cardLabel: string;
    rarity: CardRarity;
    excessCount: number;
    goldCoinsPerCopy: number;
    goldCoinsTotal: number;
}

export interface ApiDuplicatesPreviewResponse {
    totalGoldCoins: number;
    lines: ApiDuplicateSellLine[];
}

export interface ApiSellDuplicatesResponse {
    goldCoins: number;
    entries: ApiCollectionEntry[];
}

export interface ApiBuyCardResponse {
    goldCoins: number;
    entry: ApiCollectionEntry;
}
