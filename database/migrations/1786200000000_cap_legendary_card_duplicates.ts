import logger from "@adonisjs/core/services/logger";
import { BaseSchema } from "@adonisjs/lucid/schema";

const LEGENDARY_CARD_IDS = [136, 137, 138] as const;

export default class extends BaseSchema {
    async up() {
        this.defer(async (db) => {
            const legendaryIds = LEGENDARY_CARD_IDS.join(", ");

            const cappedCollection = await db.rawQuery(`
                UPDATE user_cards
                SET count = 1, updated_at = NOW()
                WHERE card_id IN (${legendaryIds})
                  AND count > 1
            `);

            const removedDeckCopies = await db.rawQuery(`
                DELETE FROM deck_cards
                WHERE id IN (
                    SELECT id
                    FROM (
                        SELECT
                            id,
                            ROW_NUMBER() OVER (
                                PARTITION BY deck_id, card_id
                                ORDER BY id
                            ) AS row_num
                        FROM deck_cards
                        WHERE card_id IN (${legendaryIds})
                    ) duplicates
                    WHERE row_num > 1
                )
            `);

            logger.info(
                `Capped ${cappedCollection.rowCount ?? 0} legendary user_cards row(s) and removed ${removedDeckCopies.rowCount ?? 0} surplus legendary deck_cards row(s)`,
            );
        });
    }

    async down() {
        logger.warn("This migration cannot be reversed");
    }
}
