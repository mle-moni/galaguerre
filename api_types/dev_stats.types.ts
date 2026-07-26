import type { CardRarity } from "./card_rarity.types.js";

export interface ApiDevStatsV1ModeStats {
    playedGames: number;
    winrate: number | null;
}

export interface ApiDevStatsV1Card {
    cardId: number;
    label: string;
    cost: number;
    rarity: CardRarity;
    liveSelectionRate: number;
    liveAvgCopies: number | null;
    human: ApiDevStatsV1ModeStats;
    ai: ApiDevStatsV1ModeStats;
}

export interface ApiDevStatsV1Meta {
    totalDecks: number;
    humanGames: number;
    aiGames: number;
    gamesScanned: number;
    gamesLimit: number;
    generatedAt: string;
}

export interface ApiDevStatsV1Payload {
    meta: ApiDevStatsV1Meta;
    cards: ApiDevStatsV1Card[];
}

export interface ApiDevStatsV1Response {
    status: "ready" | "pending";
    /** ISO timestamp of the next scheduled nightly refresh (Europe/Paris 03:00). */
    nextRefreshAt: string;
    /** True while a background refresh is running. */
    isRefreshing: boolean;
    data: ApiDevStatsV1Payload | null;
}
