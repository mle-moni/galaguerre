import { test } from "@japa/runner";
import { buildPlayerPeriodStats, mapPlayerAggRow } from "#services/dev_stats/compute_player_stats";

test.group("dev_stats:player stats", () => {
    test("buildPlayerPeriodStats computes winrate excluding draws", ({ assert }) => {
        const stats = buildPlayerPeriodStats({
            ranked: 5,
            friendly: 2,
            training: 1,
            onboarding: 0,
            total: 8,
            wins: 4,
            losses: 2,
            draws: 2,
        });

        assert.equal(stats.winrate, 4 / 6);
        assert.equal(stats.total, 8);
    });

    test("mapPlayerAggRow builds 7d delta vs previous week", ({ assert }) => {
        const row = mapPlayerAggRow({
            user_id: 42,
            pseudo: "Mayeul",
            avatar_card_id: 1,
            elo: 1300,
            ranked: 10,
            friendly: 2,
            training: 3,
            onboarding: 1,
            total: 16,
            wins: 8,
            losses: 6,
            draws: 2,
            ranked_7d: 4,
            friendly_7d: 0,
            training_7d: 1,
            onboarding_7d: 0,
            total_7d: 5,
            wins_7d: 3,
            losses_7d: 2,
            draws_7d: 0,
            total_prev_7d: 10,
            ranked_30d: 8,
            friendly_30d: 1,
            training_30d: 2,
            onboarding_30d: 0,
            total_30d: 11,
            wins_30d: 6,
            losses_30d: 4,
            draws_30d: 1,
        });

        assert.equal(row.userId, 42);
        assert.equal(row.last7Days.total, 5);
        assert.equal(row.last7Days.previousWeekTotal, 10);
        assert.equal(row.last7Days.totalDeltaPct, -0.5);
        assert.equal(row.allTime.winrate, 8 / 14);
    });
});
