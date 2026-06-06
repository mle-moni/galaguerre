import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "targets";

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string("target_team").notNullable().defaultTo("OPPONENT");
        });

        this.defer(async (db) => {
            await db.from(this.tableName).update({ target_team: "OPPONENT" });
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn("target_team");
        });
    }
}
