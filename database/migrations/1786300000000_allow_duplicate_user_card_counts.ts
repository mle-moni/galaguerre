import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.defer(async (db) => {
            await db.rawQuery(`
                ALTER TABLE user_cards
                DROP CONSTRAINT IF EXISTS user_cards_count_check
            `);

            await db.rawQuery(`
                ALTER TABLE user_cards
                ADD CONSTRAINT user_cards_count_check CHECK (count >= 1)
            `);
        });
    }

    async down() {
        this.defer(async (db) => {
            await db.rawQuery(`
                UPDATE user_cards
                SET count = LEAST(count, 2), updated_at = NOW()
                WHERE count > 2
            `);

            await db.rawQuery(`
                ALTER TABLE user_cards
                DROP CONSTRAINT IF EXISTS user_cards_count_check
            `);

            await db.rawQuery(`
                ALTER TABLE user_cards
                ADD CONSTRAINT user_cards_count_check CHECK (count >= 1 AND count <= 2)
            `);
        });
    }
}
