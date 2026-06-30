import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "cards";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.text("generated_description").nullable();
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("generated_description");
        });
    }
}
