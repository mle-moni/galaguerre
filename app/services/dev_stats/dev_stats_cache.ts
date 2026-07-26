import type {
    ApiDevCachedStatsResponse,
    ApiDevCardsStatsPayload,
    ApiDevCardsStatsResponse,
    ApiDevGameStatsPayload,
    ApiDevGameStatsResponse,
    ApiDevPlayerStatsPayload,
    ApiDevPlayerStatsResponse,
} from "#api_types/dev_stats.types";
import { computeGameStats } from "#services/dev_stats/compute_game_stats";
import { computePlayerStats } from "#services/dev_stats/compute_player_stats";
import { computeStatsV1 } from "#services/dev_stats/compute_stats_v1";
import { DateTime } from "luxon";

export const DEV_STATS_TIMEZONE = "Europe/Paris";
export const DEV_STATS_REFRESH_HOUR = 3;

/** @deprecated Prefer DEV_STATS_TIMEZONE */
export const DEV_STATS_V1_TIMEZONE = DEV_STATS_TIMEZONE;
/** @deprecated Prefer DEV_STATS_REFRESH_HOUR */
export const DEV_STATS_V1_REFRESH_HOUR = DEV_STATS_REFRESH_HOUR;

let cachedCards: ApiDevCardsStatsPayload | null = null;
let cachedGames: ApiDevGameStatsPayload | null = null;
let cachedPlayers: ApiDevPlayerStatsPayload | null = null;
let refreshPromise: Promise<void> | null = null;
let scheduledTimeout: ReturnType<typeof setTimeout> | null = null;

/** Next 03:00 Europe/Paris strictly after `from`. */
export const getNextDevStatsRefreshAt = (from: DateTime = DateTime.now()): DateTime => {
    const local = from.setZone(DEV_STATS_TIMEZONE);
    let next = local.set({
        hour: DEV_STATS_REFRESH_HOUR,
        minute: 0,
        second: 0,
        millisecond: 0,
    });
    if (next <= local) {
        next = next.plus({ days: 1 });
    }
    return next;
};

/** @deprecated Prefer getNextDevStatsRefreshAt */
export const getNextDevStatsV1RefreshAt = getNextDevStatsRefreshAt;

const envelope = <TPayload>(data: TPayload | null): ApiDevCachedStatsResponse<TPayload> => ({
    status: data ? "ready" : "pending",
    nextRefreshAt: getNextDevStatsRefreshAt().toUTC().toISO()!,
    isRefreshing: refreshPromise !== null,
    data,
});

export const getDevStatsCardsCacheSnapshot = (): ApiDevCardsStatsResponse => envelope(cachedCards);

export const getDevStatsGamesCacheSnapshot = (): ApiDevGameStatsResponse => {
    // Invalidate pre-rolling7Days snapshots still held in memory after a hot reload.
    if (cachedGames && !("rolling7Days" in cachedGames)) {
        cachedGames = null;
        refreshDevStatsCacheInBackground();
    }
    return envelope(cachedGames);
};

export const getDevStatsPlayersCacheSnapshot = (): ApiDevPlayerStatsResponse =>
    envelope(cachedPlayers);

/** @deprecated Prefer getDevStatsCardsCacheSnapshot */
export const getDevStatsV1CacheSnapshot = getDevStatsCardsCacheSnapshot;

export const refreshDevStatsCache = async (): Promise<void> => {
    if (refreshPromise) {
        await refreshPromise;
        return;
    }

    refreshPromise = (async () => {
        const startedAt = Date.now();
        console.info("[dev-stats] refresh starting (cards + games + players)…");
        try {
            const [cards, games, players] = await Promise.all([
                computeStatsV1(),
                computeGameStats(),
                computePlayerStats(),
            ]);
            cachedCards = cards;
            cachedGames = games;
            cachedPlayers = players;
            console.info(
                `[dev-stats] refresh done in ${Date.now() - startedAt}ms (${cards.cards.length} cards, ${games.totals.total} finished games, ${players.players.length} players)`,
            );
        } catch (error) {
            console.error("[dev-stats] refresh failed", error);
            throw error;
        } finally {
            refreshPromise = null;
        }
    })();

    await refreshPromise;
};

/** @deprecated Prefer refreshDevStatsCache */
export const refreshDevStatsV1Cache = refreshDevStatsCache;

export const refreshDevStatsCacheInBackground = (): void => {
    void refreshDevStatsCache().catch(() => undefined);
};

/** @deprecated Prefer refreshDevStatsCacheInBackground */
export const refreshDevStatsV1CacheInBackground = refreshDevStatsCacheInBackground;

export const clearDevStatsSchedule = (): void => {
    if (scheduledTimeout) {
        clearTimeout(scheduledTimeout);
        scheduledTimeout = null;
    }
};

/** @deprecated Prefer clearDevStatsSchedule */
export const clearDevStatsV1Schedule = clearDevStatsSchedule;

/** Schedule nightly refreshes (re-arms after each run to handle DST). */
export const scheduleDevStatsNightlyRefresh = (): void => {
    clearDevStatsSchedule();

    const next = getNextDevStatsRefreshAt();
    const delayMs = Math.max(1_000, next.toMillis() - Date.now());

    console.info(`[dev-stats] next refresh scheduled at ${next.toISO()}`);

    scheduledTimeout = setTimeout(() => {
        void (async () => {
            try {
                await refreshDevStatsCache();
            } catch {
                // already logged
            } finally {
                scheduleDevStatsNightlyRefresh();
            }
        })();
    }, delayMs);

    scheduledTimeout.unref?.();
};

/** @deprecated Prefer scheduleDevStatsNightlyRefresh */
export const scheduleDevStatsV1NightlyRefresh = scheduleDevStatsNightlyRefresh;

export const __setDevStatsCacheForTests = (options: {
    cards?: ApiDevCardsStatsPayload | null;
    games?: ApiDevGameStatsPayload | null;
    players?: ApiDevPlayerStatsPayload | null;
}): void => {
    if ("cards" in options) cachedCards = options.cards ?? null;
    if ("games" in options) cachedGames = options.games ?? null;
    if ("players" in options) cachedPlayers = options.players ?? null;
};

/** @deprecated Prefer __setDevStatsCacheForTests */
export const __setDevStatsV1CacheForTests = (payload: ApiDevCardsStatsPayload | null): void => {
    cachedCards = payload;
};
