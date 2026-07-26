import type { ApiDevStatsV1Payload, ApiDevStatsV1Response } from "#api_types/dev_stats.types";
import { computeStatsV1 } from "#services/dev_stats/compute_stats_v1";
import { DateTime } from "luxon";

export const DEV_STATS_V1_TIMEZONE = "Europe/Paris";
export const DEV_STATS_V1_REFRESH_HOUR = 3;

let cachedPayload: ApiDevStatsV1Payload | null = null;
let refreshPromise: Promise<void> | null = null;
let scheduledTimeout: ReturnType<typeof setTimeout> | null = null;

/** Next 03:00 Europe/Paris strictly after `from`. */
export const getNextDevStatsV1RefreshAt = (from: DateTime = DateTime.now()): DateTime => {
    const local = from.setZone(DEV_STATS_V1_TIMEZONE);
    let next = local.set({
        hour: DEV_STATS_V1_REFRESH_HOUR,
        minute: 0,
        second: 0,
        millisecond: 0,
    });
    if (next <= local) {
        next = next.plus({ days: 1 });
    }
    return next;
};

export const getDevStatsV1CacheSnapshot = (): ApiDevStatsV1Response => ({
    status: cachedPayload ? "ready" : "pending",
    nextRefreshAt: getNextDevStatsV1RefreshAt().toUTC().toISO()!,
    isRefreshing: refreshPromise !== null,
    data: cachedPayload,
});

export const refreshDevStatsV1Cache = async (): Promise<void> => {
    if (refreshPromise) {
        await refreshPromise;
        return;
    }

    refreshPromise = (async () => {
        const startedAt = Date.now();
        console.info("[dev-stats] v1 refresh starting…");
        try {
            const payload = await computeStatsV1();
            cachedPayload = payload;
            console.info(
                `[dev-stats] v1 refresh done in ${Date.now() - startedAt}ms (${payload.cards.length} cards)`,
            );
        } catch (error) {
            console.error("[dev-stats] v1 refresh failed", error);
            throw error;
        } finally {
            refreshPromise = null;
        }
    })();

    await refreshPromise;
};

/** Fire-and-forget refresh; swallows errors so callers never block on failure. */
export const refreshDevStatsV1CacheInBackground = (): void => {
    void refreshDevStatsV1Cache().catch(() => undefined);
};

export const clearDevStatsV1Schedule = (): void => {
    if (scheduledTimeout) {
        clearTimeout(scheduledTimeout);
        scheduledTimeout = null;
    }
};

/** Schedule nightly refreshes (re-arms after each run to handle DST). */
export const scheduleDevStatsV1NightlyRefresh = (): void => {
    clearDevStatsV1Schedule();

    const next = getNextDevStatsV1RefreshAt();
    const delayMs = Math.max(1_000, next.toMillis() - Date.now());

    console.info(`[dev-stats] next v1 refresh scheduled at ${next.toISO()}`);

    scheduledTimeout = setTimeout(() => {
        void (async () => {
            try {
                await refreshDevStatsV1Cache();
            } catch {
                // already logged
            } finally {
                scheduleDevStatsV1NightlyRefresh();
            }
        })();
    }, delayMs);

    // Avoid keeping the event loop alive solely for this timer in tests / short-lived processes.
    scheduledTimeout.unref?.();
};

/** Test helper: seed / clear in-memory cache. */
export const __setDevStatsV1CacheForTests = (payload: ApiDevStatsV1Payload | null): void => {
    cachedPayload = payload;
};
