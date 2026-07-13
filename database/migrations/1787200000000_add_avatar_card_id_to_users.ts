import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "users";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer("avatar_card_id").unsigned().references("id").inTable("cards").nullable();
        });

        this.defer(async (db) => {
            await db.rawQuery(`
                UPDATE users
                SET avatar_card_id = (
                    SELECT id FROM cards ORDER BY random() LIMIT 1
                )
                WHERE avatar_card_id IS NULL
            `);

            await db.rawQuery(`
                ALTER TABLE users ALTER COLUMN avatar_card_id SET NOT NULL
            `);
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("avatar_card_id");
        });
    }
}
