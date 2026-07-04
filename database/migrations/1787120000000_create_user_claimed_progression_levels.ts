import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "user_claimed_progression_levels";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.integer("user_id").references("users.id").notNullable().onDelete("CASCADE");
            table.integer("level").notNullable();
            table.timestamp("claimed_at", { useTz: true }).notNullable();

            table.unique(["user_id", "level"]);
            table.index(["user_id"]);
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
