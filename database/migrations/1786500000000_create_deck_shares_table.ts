import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "deck_shares";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.string("code", 12).notNullable().unique();
            table.integer("user_id").references("users.id").notNullable().onDelete("CASCADE");
            table.integer("deck_id").references("decks.id").notNullable().onDelete("CASCADE");
            table.string("name").notNullable();
            table.jsonb("cards").notNullable();

            table.timestamp("created_at").notNullable();
        });
    }

    async down() {
        this.schema.dropTableIfExists(this.tableName);
    }
}
