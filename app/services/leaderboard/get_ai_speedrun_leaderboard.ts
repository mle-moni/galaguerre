import type { ApiAiSpeedrunLeaderboardEntry } from "#api_types/leaderboard.types";
import db from "@adonisjs/lucid/services/db";

const AI_SPEEDRUN_LEADERBOARD_LIMIT = 100;

interface AiSpeedrunRow {
    user_id: number;
    pseudo: string | null;
    duration_seconds: number;
    round_count: number;
}

export const getAiSpeedrunLeaderboard = async (): Promise<ApiAiSpeedrunLeaderboardEntry[]> => {
    const result = await db.rawQuery<{ rows: AiSpeedrunRow[] }>(
        `
        WITH best_runs AS (
            SELECT DISTINCT ON (COALESCE(player_one_id, player_two_id))
                COALESCE(player_one_id, player_two_id) AS user_id,
                EXTRACT(EPOCH FROM (ended_at - created_at)) AS duration_seconds,
                (data->>'currentRound')::int AS round_count
            FROM games
            WHERE is_finished = true
                AND (data->>'isTraining')::boolean = true
                AND winner_id IS NOT NULL
                AND ended_at IS NOT NULL
            ORDER BY COALESCE(player_one_id, player_two_id), (ended_at - created_at) ASC, id ASC
        )
        SELECT br.user_id, u.pseudo, br.duration_seconds, br.round_count
        FROM best_runs br
        JOIN users u ON u.id = br.user_id
        ORDER BY br.duration_seconds ASC, br.round_count ASC, br.user_id ASC
        LIMIT ?
    `,
        [AI_SPEEDRUN_LEADERBOARD_LIMIT],
    );

    return result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        pseudo: row.pseudo,
        durationSeconds: row.duration_seconds,
        roundCount: row.round_count,
    }));
};
