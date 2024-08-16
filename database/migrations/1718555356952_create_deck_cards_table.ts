import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "deck_cards";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.integer("card_id").references("cards.id").notNullable().onDelete("CASCADE");
            table.integer("deck_id").references("decks.id").notNullable().onDelete("CASCADE");

            table.boolean("selected").defaultTo(false);

            table.timestamp("created_at");
            table.timestamp("updated_at");
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
