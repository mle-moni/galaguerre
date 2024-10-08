import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "tags";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.string("name").notNullable().unique();
            table.string("label").notNullable();

            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
