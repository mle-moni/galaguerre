import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "cards";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string("rarity", 20).notNullable().defaultTo("COMMON");
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("rarity");
        });
    }
}
