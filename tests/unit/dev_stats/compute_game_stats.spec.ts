import { test } from "@japa/runner";
import { DateTime } from "luxon";
import {
    buildBucketSeries,
    buildRollingDaysWithWow,
    classifyGameMode,
    computeTotalDeltaPct,
    DEV_GAME_STATS_TIMEZONE,
} from "#services/dev_stats/compute_game_stats";

test.group("dev_stats:game mode + bucketing", () => {
    test("classifyGameMode prioritizes onboarding over training", ({ assert }) => {
        assert.equal(
            classifyGameMode({ isTraining: true, isOnboardingTutorial: true }),
            "onboarding",
        );
        assert.equal(classifyGameMode({ isTraining: true }), "training");
        assert.equal(classifyGameMode({ isFriendly: true }), "friendly");
        assert.equal(classifyGameMode({}), "ranked");
    });

    test("buildBucketSeries fills missing days with zeros", ({ assert }) => {
        const now = DateTime.fromObject(
            { year: 2026, month: 7, day: 26, hour: 18 },
            { zone: DEV_GAME_STATS_TIMEZONE },
        );
        const series = buildBucketSeries("day", 3, now, [
            { bucket: "2026-07-26T00:00:00.000+02:00", mode: "ranked", count: 4 },
        ]);

        assert.lengthOf(series, 3);
        assert.equal(series[0]!.periodStart, "2026-07-24");
        assert.equal(series[0]!.total, 0);
        assert.equal(series[2]!.periodStart, "2026-07-26");
        assert.equal(series[2]!.ranked, 4);
        assert.equal(series[2]!.total, 4);
    });

    test("computeTotalDeltaPct handles zero previous", ({ assert }) => {
        assert.isNull(computeTotalDeltaPct(5, 0));
        assert.equal(computeTotalDeltaPct(10, 5), 1);
        assert.equal(computeTotalDeltaPct(5, 10), -0.5);
    });

    test("buildRollingDaysWithWow compares each day to J-7", ({ assert }) => {
        const now = DateTime.fromObject(
            { year: 2026, month: 7, day: 26, hour: 18 },
            { zone: DEV_GAME_STATS_TIMEZONE },
        );
        const byDay = buildBucketSeries("day", 14, now, [
            { bucket: "2026-07-19T00:00:00.000+02:00", mode: "ranked", count: 10 },
            { bucket: "2026-07-26T00:00:00.000+02:00", mode: "ranked", count: 15 },
        ]);

        const rolling = buildRollingDaysWithWow(byDay, 7);
        assert.lengthOf(rolling.days, 7);

        const today = rolling.days[6]!;
        assert.equal(today.periodStart, "2026-07-26");
        assert.equal(today.total, 15);
        assert.equal(today.previousWeekTotal, 10);
        assert.equal(today.totalDeltaPct, 0.5);

        assert.equal(rolling.window.total, 15);
        assert.equal(rolling.window.previousWeekTotal, 10);
        assert.equal(rolling.window.totalDeltaPct, 0.5);
    });
});
