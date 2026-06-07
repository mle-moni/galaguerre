import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "users";

    async up() {
        this.schema.alterTable("users", (table) => {
            table.integer("elo").notNullable().defaultTo(1200);
            table.integer("wins").notNullable().defaultTo(0);
            table.integer("losses").notNullable().defaultTo(0);
        });

        this.schema.alterTable("games", (table) => {
            table.integer("winner_id").nullable().references("users.id").onDelete("SET NULL");
        });
    }

    async down() {
        this.schema.alterTable("games", (table) => {
            table.dropColumn("winner_id");
        });

        this.schema.alterTable("users", (table) => {
            table.dropColumn("elo");
            table.dropColumn("wins");
            table.dropColumn("losses");
        });
    }
}
