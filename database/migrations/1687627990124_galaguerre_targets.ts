import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "targets";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.string("type").notNullable();
            table.string("internal_label").notNullable();
            table.integer("comparison_id").references("comparisons.id").onDelete("CASCADE");
            table.integer("tag_id").references("tags.id").onDelete("CASCADE");
            table.string("target_team").notNullable().defaultTo("OPPONENT");
            table.boolean("exclude_self").notNullable().defaultTo(false);
            table.integer("max_targets").nullable();
            table.string("target_selection_mode").nullable();

            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });
        });
    }

    async down() {
        this.schema.dropTableIfExists(this.tableName);
    }
}
