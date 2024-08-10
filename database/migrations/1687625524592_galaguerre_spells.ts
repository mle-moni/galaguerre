import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "spells";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.string("internal_label").notNullable();

            table.integer("action_id").references("actions.id").notNullable().onDelete("CASCADE");

            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
