import { test } from "@japa/runner";
import { DateTime } from "luxon";
import {
    DEV_STATS_TIMEZONE,
    getNextDevStatsRefreshAt,
    getDevStatsCardsCacheSnapshot,
    getDevStatsGamesCacheSnapshot,
    __setDevStatsCacheForTests,
} from "#services/dev_stats/dev_stats_cache";

test.group("dev_stats:unified cache", (group) => {
    group.each.setup(() => {
        __setDevStatsCacheForTests({ cards: null, games: null });
    });

    test("getNextDevStatsRefreshAt returns tonight 03:00 when before 03:00", ({ assert }) => {
        const from = DateTime.fromObject(
            { year: 2026, month: 7, day: 26, hour: 2, minute: 30 },
            { zone: DEV_STATS_TIMEZONE },
        );
        const next = getNextDevStatsRefreshAt(from);
        assert.equal(next.toISO(), "2026-07-26T03:00:00.000+02:00");
    });

    test("getNextDevStatsRefreshAt returns tomorrow 03:00 when after 03:00", ({ assert }) => {
        const from = DateTime.fromObject(
            { year: 2026, month: 7, day: 26, hour: 15, minute: 0 },
            { zone: DEV_STATS_TIMEZONE },
        );
        const next = getNextDevStatsRefreshAt(from);
        assert.equal(next.toISO(), "2026-07-27T03:00:00.000+02:00");
    });

    test("cache snapshots are pending when empty", ({ assert }) => {
        const cards = getDevStatsCardsCacheSnapshot();
        const games = getDevStatsGamesCacheSnapshot();
        assert.equal(cards.status, "pending");
        assert.equal(games.status, "pending");
        assert.isNull(cards.data);
        assert.isNull(games.data);
    });
});
