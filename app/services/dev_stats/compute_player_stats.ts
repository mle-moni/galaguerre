import type {
    ApiDevPlayerPeriodStats,
    ApiDevPlayerStatsPayload,
    ApiDevPlayerStatsRow,
} from "#api_types/dev_stats.types";
import {
    computeTotalDeltaPct,
    DEV_GAME_STATS_TIMEZONE,
} from "#services/dev_stats/compute_game_stats";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";

export const DEV_PLAYER_STATS_LIMIT = 100;

type PlayerAggRow = {
    user_id: number;
    pseudo: string | null;
    avatar_card_id: number;
    elo: number;
    // all-time
    ranked: number;
    friendly: number;
    training: number;
    onboarding: number;
    total: number;
    wins: number;
    losses: number;
    draws: number;
    // 7d
    ranked_7d: number;
    friendly_7d: number;
    training_7d: number;
    onboarding_7d: number;
    total_7d: number;
    wins_7d: number;
    losses_7d: number;
    draws_7d: number;
    total_prev_7d: number;
    // 30d
    ranked_30d: number;
    friendly_30d: number;
    training_30d: number;
    onboarding_30d: number;
    total_30d: number;
    wins_30d: number;
    losses_30d: number;
    draws_30d: number;
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

export const buildPlayerPeriodStats = (input: {
    ranked: number;
    friendly: number;
    training: number;
    onboarding: number;
    total: number;
    wins: number;
    losses: number;
    draws: number;
}): ApiDevPlayerPeriodStats => {
    const decisive = input.wins + input.losses;
    return {
        ranked: input.ranked,
        friendly: input.friendly,
        training: input.training,
        onboarding: input.onboarding,
        total: input.total,
        wins: input.wins,
        losses: input.losses,
        draws: input.draws,
        winrate: decisive === 0 ? null : input.wins / decisive,
    };
};

const n = (value: string | number | null | undefined) => Number(value ?? 0);

export const mapPlayerAggRow = (row: PlayerAggRow): ApiDevPlayerStatsRow => {
    const last7Total = n(row.total_7d);
    const previousWeekTotal = n(row.total_prev_7d);

    return {
        userId: Number(row.user_id),
        pseudo: row.pseudo,
        avatarCardId: Number(row.avatar_card_id),
        elo: Number(row.elo),
        allTime: buildPlayerPeriodStats({
            ranked: n(row.ranked),
            friendly: n(row.friendly),
            training: n(row.training),
            onboarding: n(row.onboarding),
            total: n(row.total),
            wins: n(row.wins),
            losses: n(row.losses),
            draws: n(row.draws),
        }),
        last7Days: {
            ...buildPlayerPeriodStats({
                ranked: n(row.ranked_7d),
                friendly: n(row.friendly_7d),
                training: n(row.training_7d),
                onboarding: n(row.onboarding_7d),
                total: last7Total,
                wins: n(row.wins_7d),
                losses: n(row.losses_7d),
                draws: n(row.draws_7d),
            }),
            previousWeekTotal,
            totalDeltaPct: computeTotalDeltaPct(last7Total, previousWeekTotal),
        },
        last30Days: buildPlayerPeriodStats({
            ranked: n(row.ranked_30d),
            friendly: n(row.friendly_30d),
            training: n(row.training_30d),
            onboarding: n(row.onboarding_30d),
            total: n(row.total_30d),
            wins: n(row.wins_30d),
            losses: n(row.losses_30d),
            draws: n(row.draws_30d),
        }),
    };
};

export const computePlayerStats = async (
    now: DateTime = DateTime.now(),
    limit = DEV_PLAYER_STATS_LIMIT,
): Promise<ApiDevPlayerStatsPayload> => {
    const localNow = now.setZone(DEV_GAME_STATS_TIMEZONE);
    const sevenDaysAgo = localNow.startOf("day").minus({ days: 6 }).toUTC().toISO();
    const fourteenDaysAgo = localNow.startOf("day").minus({ days: 13 }).toUTC().toISO();
    const thirtyDaysAgo = localNow.startOf("day").minus({ days: 29 }).toUTC().toISO();

    const result = await db.rawQuery<{ rows: PlayerAggRow[] }>(
        `
        WITH seats AS (
            SELECT
                g.player_one_id AS user_id,
                ${FINISHED_AT_SQL} AS finished_at,
                ${MODE_SQL} AS mode,
                CASE
                    WHEN g.winner_id = g.player_one_id THEN 'win'
                    WHEN g.winner_id IS NOT NULL THEN 'loss'
                    WHEN g.data->>'winnerSide' = 'PLAYER_ONE' THEN 'win'
                    WHEN g.data->>'winnerSide' = 'PLAYER_TWO' THEN 'loss'
                    ELSE 'draw'
                END AS outcome
            FROM games g
            WHERE g.is_finished = true
              AND g.player_one_id IS NOT NULL

            UNION ALL

            SELECT
                g.player_two_id AS user_id,
                ${FINISHED_AT_SQL} AS finished_at,
                ${MODE_SQL} AS mode,
                CASE
                    WHEN g.winner_id = g.player_two_id THEN 'win'
                    WHEN g.winner_id IS NOT NULL THEN 'loss'
                    WHEN g.data->>'winnerSide' = 'PLAYER_TWO' THEN 'win'
                    WHEN g.data->>'winnerSide' = 'PLAYER_ONE' THEN 'loss'
                    ELSE 'draw'
                END AS outcome
            FROM games g
            WHERE g.is_finished = true
              AND g.player_two_id IS NOT NULL
        ),
        agg AS (
            SELECT
                user_id,
                COUNT(*) FILTER (WHERE mode = 'ranked')::int AS ranked,
                COUNT(*) FILTER (WHERE mode = 'friendly')::int AS friendly,
                COUNT(*) FILTER (WHERE mode = 'training')::int AS training,
                COUNT(*) FILTER (WHERE mode = 'onboarding')::int AS onboarding,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE outcome = 'win')::int AS wins,
                COUNT(*) FILTER (WHERE outcome = 'loss')::int AS losses,
                COUNT(*) FILTER (WHERE outcome = 'draw')::int AS draws,

                COUNT(*) FILTER (WHERE mode = 'ranked' AND finished_at >= ?)::int AS ranked_7d,
                COUNT(*) FILTER (WHERE mode = 'friendly' AND finished_at >= ?)::int AS friendly_7d,
                COUNT(*) FILTER (WHERE mode = 'training' AND finished_at >= ?)::int AS training_7d,
                COUNT(*) FILTER (WHERE mode = 'onboarding' AND finished_at >= ?)::int AS onboarding_7d,
                COUNT(*) FILTER (WHERE finished_at >= ?)::int AS total_7d,
                COUNT(*) FILTER (WHERE outcome = 'win' AND finished_at >= ?)::int AS wins_7d,
                COUNT(*) FILTER (WHERE outcome = 'loss' AND finished_at >= ?)::int AS losses_7d,
                COUNT(*) FILTER (WHERE outcome = 'draw' AND finished_at >= ?)::int AS draws_7d,
                COUNT(*) FILTER (
                    WHERE finished_at >= ? AND finished_at < ?
                )::int AS total_prev_7d,

                COUNT(*) FILTER (WHERE mode = 'ranked' AND finished_at >= ?)::int AS ranked_30d,
                COUNT(*) FILTER (WHERE mode = 'friendly' AND finished_at >= ?)::int AS friendly_30d,
                COUNT(*) FILTER (WHERE mode = 'training' AND finished_at >= ?)::int AS training_30d,
                COUNT(*) FILTER (WHERE mode = 'onboarding' AND finished_at >= ?)::int AS onboarding_30d,
                COUNT(*) FILTER (WHERE finished_at >= ?)::int AS total_30d,
                COUNT(*) FILTER (WHERE outcome = 'win' AND finished_at >= ?)::int AS wins_30d,
                COUNT(*) FILTER (WHERE outcome = 'loss' AND finished_at >= ?)::int AS losses_30d,
                COUNT(*) FILTER (WHERE outcome = 'draw' AND finished_at >= ?)::int AS draws_30d
            FROM seats
            GROUP BY user_id
        )
        SELECT
            agg.*,
            u.pseudo,
            u.avatar_card_id,
            u.elo
        FROM agg
        JOIN users u ON u.id = agg.user_id
        ORDER BY agg.total DESC, agg.total_7d DESC, u.id ASC
        LIMIT ?
        `,
        [
            // 7d mode + totals (8 params all sevenDaysAgo)
            sevenDaysAgo,
            sevenDaysAgo,
            sevenDaysAgo,
            sevenDaysAgo,
            sevenDaysAgo,
            sevenDaysAgo,
            sevenDaysAgo,
            sevenDaysAgo,
            // prev 7d window
            fourteenDaysAgo,
            sevenDaysAgo,
            // 30d (8 params)
            thirtyDaysAgo,
            thirtyDaysAgo,
            thirtyDaysAgo,
            thirtyDaysAgo,
            thirtyDaysAgo,
            thirtyDaysAgo,
            thirtyDaysAgo,
            thirtyDaysAgo,
            limit,
        ],
    );

    return {
        meta: {
            generatedAt: new Date().toISOString(),
            timezone: DEV_GAME_STATS_TIMEZONE,
            limit,
        },
        players: result.rows.map(mapPlayerAggRow),
    };
};
