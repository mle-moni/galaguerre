import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "users";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer("gold_coins").notNullable().defaultTo(0);
            table.date("last_daily_pack_claimed_on").nullable();
            table.date("last_victory_pack_granted_on").nullable();
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("gold_coins");
            table.dropColumn("last_daily_pack_claimed_on");
            table.dropColumn("last_victory_pack_granted_on");
        });
    }
}
