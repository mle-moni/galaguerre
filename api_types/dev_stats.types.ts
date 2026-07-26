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

export interface ApiDevCardsStatsPayload {
    meta: ApiDevStatsV1Meta;
    cards: ApiDevStatsV1Card[];
}

/** @deprecated Prefer ApiDevCardsStatsPayload */
export type ApiDevStatsV1Payload = ApiDevCardsStatsPayload;

export type ApiDevGameMode = "ranked" | "friendly" | "training" | "onboarding";

export interface ApiDevGameModeCounts {
    ranked: number;
    friendly: number;
    training: number;
    onboarding: number;
    total: number;
}

export interface ApiDevGameStatsBucket extends ApiDevGameModeCounts {
    /** Period start ISO date (YYYY-MM-DD) in Europe/Paris. */
    periodStart: string;
    /** Human-readable label for the period. */
    label: string;
}

export interface ApiDevGameStatsRollingDay extends ApiDevGameStatsBucket {
    /** Total games on the same weekday previous week. */
    previousWeekTotal: number;
    /**
     * Relative change of `total` vs `previousWeekTotal`.
     * `null` when previous week had 0 games (undefined %).
     */
    totalDeltaPct: number | null;
}

export interface ApiDevGameStatsRolling7Days {
    days: ApiDevGameStatsRollingDay[];
    /** Sum of the last 7 days vs the 7 days before that. */
    window: ApiDevGameModeCounts & {
        previousWeekTotal: number;
        totalDeltaPct: number | null;
    };
}

export interface ApiDevGameStatsPayload {
    meta: {
        generatedAt: string;
        timezone: string;
    };
    totals: ApiDevGameModeCounts;
    rolling7Days: ApiDevGameStatsRolling7Days;
    byDay: ApiDevGameStatsBucket[];
    byWeek: ApiDevGameStatsBucket[];
    byMonth: ApiDevGameStatsBucket[];
}

export interface ApiDevCachedStatsResponse<TPayload> {
    status: "ready" | "pending";
    /** ISO timestamp of the next scheduled nightly refresh (Europe/Paris 03:00). */
    nextRefreshAt: string;
    /** True while a background refresh is running. */
    isRefreshing: boolean;
    data: TPayload | null;
}

export type ApiDevCardsStatsResponse = ApiDevCachedStatsResponse<ApiDevCardsStatsPayload>;
export type ApiDevGameStatsResponse = ApiDevCachedStatsResponse<ApiDevGameStatsPayload>;
export type ApiDevPlayerStatsResponse = ApiDevCachedStatsResponse<ApiDevPlayerStatsPayload>;

/** @deprecated Prefer ApiDevCardsStatsResponse */
export type ApiDevStatsV1Response = ApiDevCardsStatsResponse;

export interface ApiDevPlayerPeriodStats extends ApiDevGameModeCounts {
    wins: number;
    losses: number;
    draws: number;
    /** wins / (wins + losses); null if no decisive games. */
    winrate: number | null;
}

export interface ApiDevPlayerPeriodStatsWithDelta extends ApiDevPlayerPeriodStats {
    previousWeekTotal: number;
    totalDeltaPct: number | null;
}

export interface ApiDevPlayerStatsRow {
    userId: number;
    pseudo: string | null;
    avatarCardId: number;
    elo: number;
    allTime: ApiDevPlayerPeriodStats;
    last7Days: ApiDevPlayerPeriodStatsWithDelta;
    last30Days: ApiDevPlayerPeriodStats;
}

export interface ApiDevPlayerStatsPayload {
    meta: {
        generatedAt: string;
        timezone: string;
        limit: number;
    };
    players: ApiDevPlayerStatsRow[];
}
