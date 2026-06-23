import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "game_replays";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table
                .integer("game_id")
                .unsigned()
                .notNullable()
                .unique()
                .references("id")
                .inTable("games")
                .onDelete("CASCADE");

            table.jsonb("data").notNullable();

            table.timestamp("created_at").notNullable();
        });
    }

    async down() {
        this.schema.dropTableIfExists(this.tableName);
    }
}
