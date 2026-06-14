import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "cards";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.boolean("is_collectible").notNullable().defaultTo(true);
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("is_collectible");
        });
    }
}
