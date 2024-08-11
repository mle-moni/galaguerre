import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "games";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.integer("player_one_id").references("users.id").notNullable().onDelete("CASCADE");
            table.integer("player_two_id").references("users.id").notNullable().onDelete("CASCADE");

            table.jsonb("data").notNullable();

            table.boolean("is_finished").defaultTo(false);

            table.timestamp("created_at").notNullable();
            table.timestamp("updated_at").notNullable();
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
