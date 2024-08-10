import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "card_filter_tags";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.integer("card_filter_id").references("card_filters.id").notNullable();

            table.integer("tag_id").references("tags.id").notNullable().onDelete("CASCADE");

            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
