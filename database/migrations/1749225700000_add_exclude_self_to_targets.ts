import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "targets";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.boolean("exclude_self").notNullable().defaultTo(false);
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("exclude_self");
        });
    }
}
