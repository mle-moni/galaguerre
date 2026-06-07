import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.defer(async (db) => {
            await db.rawQuery(`
                UPDATE games
                SET player_two_id = NULL
                WHERE player_two_id IN (
                    SELECT id FROM users WHERE email = 'training-bot@galaguerre.local'
                )
            `);

            await db.rawQuery(`
                DELETE FROM users WHERE email = 'training-bot@galaguerre.local'
            `);
        });

        this.schema.alterTable("games", (table) => {
            table.dropForeign(["player_two_id"]);
        });

        this.schema.alterTable("games", (table) => {
            table.integer("player_two_id").nullable().alter();
            table.foreign("player_two_id").references("id").inTable("users").onDelete("SET NULL");
        });
    }

    async down() {
        this.schema.alterTable("games", (table) => {
            table.dropForeign(["player_two_id"]);
        });

        this.schema.alterTable("games", (table) => {
            table.integer("player_two_id").notNullable().alter();
            table.foreign("player_two_id").references("id").inTable("users").onDelete("CASCADE");
        });
    }
}
