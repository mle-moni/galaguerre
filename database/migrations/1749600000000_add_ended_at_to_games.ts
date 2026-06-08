import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "games";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.timestamp("ended_at").nullable();
        });

        this.defer(async (db) => {
            await db.rawQuery(`
                UPDATE games
                SET ended_at = updated_at
                WHERE is_finished = true
            `);
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("ended_at");
        });
    }
}
