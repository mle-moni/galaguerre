import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.schema.alterTable("games", (table) => {
            table.dropForeign(["player_one_id"]);
        });

        this.schema.alterTable("games", (table) => {
            table.integer("player_one_id").nullable().alter();
            table.foreign("player_one_id").references("id").inTable("users").onDelete("SET NULL");
        });
    }

    async down() {
        this.schema.alterTable("games", (table) => {
            table.dropForeign(["player_one_id"]);
        });

        this.schema.alterTable("games", (table) => {
            table.integer("player_one_id").notNullable().alter();
            table.foreign("player_one_id").references("id").inTable("users").onDelete("CASCADE");
        });
    }
}
