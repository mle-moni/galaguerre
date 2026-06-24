import type { ApiCatalogCard } from "./deck.types.js";
import { GALADRIM_AGGRO_DECK_RECIPE } from "../database/seed_data/balanced_decks.js";

export const COLLECTION_MAX_COPIES_PER_CARD = 2;
export const PACK_SIZE = 5;

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
