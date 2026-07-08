import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

export const syncUserWinsLosses = async (): Promise<void> => {
    logger.info("user wins/losses sync starting...");

    await db.transaction(async (trx) => {
        await trx.rawQuery(`UPDATE users SET wins = 0, losses = 0`);

        await trx.rawQuery(`
            WITH pvp_games AS (
                SELECT
                    winner_id,
                    player_one_id,
                    player_two_id
                FROM games
                WHERE is_finished = true
                    AND winner_id IS NOT NULL
                    AND player_one_id IS NOT NULL
                    AND player_two_id IS NOT NULL
                    AND (data->>'isTraining')::boolean IS NOT TRUE
            ),
            stats AS (
                SELECT
                    user_id,
                    SUM(wins)::int AS wins,
                    SUM(losses)::int AS losses
                FROM (
                    SELECT winner_id AS user_id, 1 AS wins, 0 AS losses
                    FROM pvp_games
                    UNION ALL
                    SELECT
                        CASE
                            WHEN winner_id = player_one_id THEN player_two_id
                            ELSE player_one_id
                        END,
                        0,
                        1
                    FROM pvp_games
                ) outcomes
                GROUP BY user_id
            )
            UPDATE users u
            SET
                wins = s.wins,
                losses = s.losses
            FROM stats s
            WHERE u.id = s.user_id
        `);
    });

    logger.info("user wins/losses sync completed");
};
