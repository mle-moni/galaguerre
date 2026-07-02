import type { ApiDeck, ApiDeckCardEntry } from "./deck.types.js";

export interface ApiDeckShare {
    code: string;
    name: string;
    authorUserId: number;
    authorPseudo: string;
    cards: ApiDeckCardEntry[];
    cardCount: number;
    valid: boolean;
    compositionErrors: string[];
    createdAt: string;
}

export interface CreateDeckShareResponse {
    code: string;
    url: string;
}

export interface ImportDeckPayload {
    shareCode: string;
}

export interface ImportDeckResponse {
    deck: ApiDeck;
    missingCards: ApiDeckCardEntry[];
}
