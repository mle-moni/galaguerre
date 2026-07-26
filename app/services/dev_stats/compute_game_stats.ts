import type {
    ApiDevGameMode,
    ApiDevGameModeCounts,
    ApiDevGameStatsBucket,
    ApiDevGameStatsPayload,
    ApiDevGameStatsRolling7Days,
    ApiDevGameStatsRollingDay,
} from "#api_types/dev_stats.types";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";

export const DEV_GAME_STATS_TIMEZONE = "Europe/Paris";
export const DEV_GAME_STATS_DAY_COUNT = 30;
export const DEV_GAME_STATS_WEEK_COUNT = 12;
export const DEV_GAME_STATS_MONTH_COUNT = 12;
export const DEV_GAME_STATS_ROLLING_DAYS = 7;

type SqlAggRow = {
    bucket: string;
    mode: ApiDevGameMode;
    count: string | number;
};

const emptyCounts = (): ApiDevGameModeCounts => ({
    ranked: 0,
    friendly: 0,
    training: 0,
    onboarding: 0,
    total: 0,
});

export const classifyGameMode = (flags: {
    isTraining?: boolean;
    isFriendly?: boolean;
    isOnboardingTutorial?: boolean;
}): ApiDevGameMode => {
    if (flags.isOnboardingTutorial) return "onboarding";
    if (flags.isTraining) return "training";
    if (flags.isFriendly) return "friendly";
    return "ranked";
};

const addMode = (counts: ApiDevGameModeCounts, mode: ApiDevGameMode, n: number) => {
    counts[mode] += n;
    counts.total += n;
};

const sumCounts = (buckets: ApiDevGameModeCounts[]): ApiDevGameModeCounts => {
    const totals = emptyCounts();
    for (const bucket of buckets) {
        totals.ranked += bucket.ranked;
        totals.friendly += bucket.friendly;
        totals.training += bucket.training;
        totals.onboarding += bucket.onboarding;
        totals.total += bucket.total;
    }
    return totals;
};

export const computeTotalDeltaPct = (current: number, previous: number): number | null => {
    if (previous === 0) return null;
    return (current - previous) / previous;
};

const parseBucketStart = (raw: string): DateTime => {
    // Postgres date_trunc returns timestamps; knex may stringify them.
    const parsed = DateTime.fromISO(raw, { zone: DEV_GAME_STATS_TIMEZONE });
    if (parsed.isValid) return parsed;
    const fromSql = DateTime.fromSQL(raw, { zone: DEV_GAME_STATS_TIMEZONE });
    if (fromSql.isValid) return fromSql;
    return DateTime.fromJSDate(new Date(raw), { zone: DEV_GAME_STATS_TIMEZONE });
};

const formatDayLabel = (dt: DateTime) => dt.setLocale("fr").toFormat("ccc dd/LL/yyyy");
const formatWeekLabel = (dt: DateTime) => {
    const end = dt.plus({ days: 6 });
    return `S${dt.toFormat("WW")} · ${dt.toFormat("dd/LL")} → ${end.toFormat("dd/LL/yyyy")}`;
};
const formatMonthLabel = (dt: DateTime) => dt.setLocale("fr").toFormat("LLLL yyyy");

export const buildBucketSeries = (
    granularity: "day" | "week" | "month",
    count: number,
    now: DateTime,
    rows: SqlAggRow[],
): ApiDevGameStatsBucket[] => {
    const localNow = now.setZone(DEV_GAME_STATS_TIMEZONE);
    const byKey = new Map<string, ApiDevGameModeCounts>();

    for (const row of rows) {
        const start = parseBucketStart(String(row.bucket)).startOf(
            granularity === "day" ? "day" : granularity === "week" ? "week" : "month",
        );
        const key = start.toISODate()!;
        const counts = byKey.get(key) ?? emptyCounts();
        addMode(counts, row.mode, Number(row.count));
        byKey.set(key, counts);
    }

    const series: ApiDevGameStatsBucket[] = [];
    for (let i = count - 1; i >= 0; i--) {
        const start =
            granularity === "day"
                ? localNow.startOf("day").minus({ days: i })
                : granularity === "week"
                  ? localNow.startOf("week").minus({ weeks: i })
                  : localNow.startOf("month").minus({ months: i });
        const key = start.toISODate()!;
        const counts = byKey.get(key) ?? emptyCounts();
        series.push({
            periodStart: key,
            label:
                granularity === "day"
                    ? formatDayLabel(start)
                    : granularity === "week"
                      ? formatWeekLabel(start)
                      : formatMonthLabel(start),
            ...counts,
        });
    }
    return series;
};

/** Last N days with WoW delta vs the same weekday previous week. Requires `byDay` covering 2N days. */
export const buildRollingDaysWithWow = (
    byDay: ApiDevGameStatsBucket[],
    rollingDays = DEV_GAME_STATS_ROLLING_DAYS,
): ApiDevGameStatsRolling7Days => {
    const byKey = new Map(byDay.map((day) => [day.periodStart, day]));
    const recent = byDay.slice(-rollingDays);
    const previousWindow = byDay.slice(-(rollingDays * 2), -rollingDays);

    const days: ApiDevGameStatsRollingDay[] = recent.map((day) => {
        const previousKey = DateTime.fromISO(day.periodStart, {
            zone: DEV_GAME_STATS_TIMEZONE,
        })
            .minus({ days: rollingDays })
            .toISODate()!;
        const previousWeekTotal = byKey.get(previousKey)?.total ?? 0;
        return {
            ...day,
            previousWeekTotal,
            totalDeltaPct: computeTotalDeltaPct(day.total, previousWeekTotal),
        };
    });

    const windowCounts = sumCounts(recent);
    const previousWeekTotal = sumCounts(previousWindow).total;

    return {
        days,
        window: {
            ...windowCounts,
            previousWeekTotal,
            totalDeltaPct: computeTotalDeltaPct(windowCounts.total, previousWeekTotal),
        },
    };
};

const MODE_SQL = `
    CASE
        WHEN COALESCE((data->>'isOnboardingTutorial')::boolean, false) THEN 'onboarding'
        WHEN COALESCE((data->>'isTraining')::boolean, false) THEN 'training'
        WHEN COALESCE((data->>'isFriendly')::boolean, false) THEN 'friendly'
        ELSE 'ranked'
    END
`;

const FINISHED_AT_SQL = `COALESCE(ended_at, created_at)`;

const loadAggregates = async (
    truncUnit: "day" | "week" | "month",
    since: DateTime,
): Promise<SqlAggRow[]> => {
    const sinceUtc = since.toUTC().toISO();
    const result = await db.rawQuery<{ rows: SqlAggRow[] }>(
        `
        SELECT
            date_trunc(?, (${FINISHED_AT_SQL} AT TIME ZONE 'UTC') AT TIME ZONE ?) AS bucket,
            ${MODE_SQL} AS mode,
            COUNT(*)::int AS count
        FROM games
        WHERE is_finished = true
          AND ${FINISHED_AT_SQL} >= ?
        GROUP BY 1, 2
        ORDER BY 1 ASC
        `,
        [truncUnit, DEV_GAME_STATS_TIMEZONE, sinceUtc],
    );

    return result.rows;
};

const loadTotals = async (): Promise<ApiDevGameModeCounts> => {
    const result = await db.rawQuery<{
        rows: Array<{ mode: ApiDevGameMode; count: string | number }>;
    }>(
        `
        SELECT
            ${MODE_SQL} AS mode,
            COUNT(*)::int AS count
        FROM games
        WHERE is_finished = true
        GROUP BY 1
        `,
    );

    const totals = emptyCounts();
    for (const row of result.rows) {
        addMode(totals, row.mode, Number(row.count));
    }
    return totals;
};

export const computeGameStats = async (
    now: DateTime = DateTime.now(),
): Promise<ApiDevGameStatsPayload> => {
    const localNow = now.setZone(DEV_GAME_STATS_TIMEZONE);
    const daySince = localNow.startOf("day").minus({ days: DEV_GAME_STATS_DAY_COUNT - 1 });
    const weekSince = localNow.startOf("week").minus({ weeks: DEV_GAME_STATS_WEEK_COUNT - 1 });
    const monthSince = localNow.startOf("month").minus({ months: DEV_GAME_STATS_MONTH_COUNT - 1 });

    const [totals, dayRows, weekRows, monthRows] = await Promise.all([
        loadTotals(),
        loadAggregates("day", daySince),
        loadAggregates("week", weekSince),
        loadAggregates("month", monthSince),
    ]);

    const byDay = buildBucketSeries("day", DEV_GAME_STATS_DAY_COUNT, localNow, dayRows);

    return {
        meta: {
            generatedAt: new Date().toISOString(),
            timezone: DEV_GAME_STATS_TIMEZONE,
        },
        totals,
        rolling7Days: buildRollingDaysWithWow(byDay),
        byDay,
        byWeek: buildBucketSeries("week", DEV_GAME_STATS_WEEK_COUNT, localNow, weekRows),
        byMonth: buildBucketSeries("month", DEV_GAME_STATS_MONTH_COUNT, localNow, monthRows),
    };
};
