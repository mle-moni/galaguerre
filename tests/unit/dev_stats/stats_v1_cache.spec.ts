import { test } from "@japa/runner";
import { DateTime } from "luxon";
import {
    DEV_STATS_V1_TIMEZONE,
    getNextDevStatsV1RefreshAt,
    getDevStatsV1CacheSnapshot,
    __setDevStatsV1CacheForTests,
} from "#services/dev_stats/stats_v1_cache";

test.group("dev_stats:v1 cache", (group) => {
    group.each.setup(() => {
        __setDevStatsV1CacheForTests(null);
    });

    test("getNextDevStatsV1RefreshAt returns tonight 03:00 when before 03:00", ({ assert }) => {
        const from = DateTime.fromObject(
            { year: 2026, month: 7, day: 26, hour: 2, minute: 30 },
            { zone: DEV_STATS_V1_TIMEZONE },
        );
        const next = getNextDevStatsV1RefreshAt(from);
        assert.equal(next.toISO(), "2026-07-26T03:00:00.000+02:00");
    });

    test("getNextDevStatsV1RefreshAt returns tomorrow 03:00 when after 03:00", ({ assert }) => {
        const from = DateTime.fromObject(
            { year: 2026, month: 7, day: 26, hour: 15, minute: 0 },
            { zone: DEV_STATS_V1_TIMEZONE },
        );
        const next = getNextDevStatsV1RefreshAt(from);
        assert.equal(next.toISO(), "2026-07-27T03:00:00.000+02:00");
    });

    test("getDevStatsV1CacheSnapshot is pending when empty", ({ assert }) => {
        const snapshot = getDevStatsV1CacheSnapshot();
        assert.equal(snapshot.status, "pending");
        assert.isNull(snapshot.data);
        assert.isFalse(snapshot.isRefreshing);
        assert.isString(snapshot.nextRefreshAt);
    });
});
