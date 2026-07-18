import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "user_cards";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer("golden_count").unsigned().notNullable().defaultTo(0);
        });

        this.defer(async (db) => {
            await db.rawQuery(`
                ALTER TABLE user_cards
                DROP CONSTRAINT IF EXISTS user_cards_golden_count_check
            `);
            await db.rawQuery(`
                ALTER TABLE user_cards
                ADD CONSTRAINT user_cards_golden_count_check
                CHECK (golden_count >= 0 AND golden_count <= count)
            `);
        });
    }

    async down() {
        this.defer(async (db) => {
            await db.rawQuery(`
                ALTER TABLE user_cards
                DROP CONSTRAINT IF EXISTS user_cards_golden_count_check
            `);
        });

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("golden_count");
        });
    }
}
