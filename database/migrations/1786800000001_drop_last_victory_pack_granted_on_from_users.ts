import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "users";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("last_victory_pack_granted_on");
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.date("last_victory_pack_granted_on").nullable();
        });
    }
}
