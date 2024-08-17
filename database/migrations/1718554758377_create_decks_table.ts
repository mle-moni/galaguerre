import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "decks";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.string("name").notNullable();
            table.integer("user_id").references("users.id").notNullable().onDelete("CASCADE");

            table.boolean("selected").defaultTo(false);

            table.timestamp("created_at");
            table.timestamp("updated_at");
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
