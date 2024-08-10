import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "boosts";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.string("internal_label").notNullable();
            table.integer("health").nullable();
            table.integer("attack").nullable();
            table.integer("spell_power").nullable();

            table
                .integer("minion_power_id")
                .references("minion_powers.id")
                .nullable()
                .onDelete("CASCADE");

            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
