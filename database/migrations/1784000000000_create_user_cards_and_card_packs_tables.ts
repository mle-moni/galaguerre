import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.schema.createTable("user_cards", (table) => {
            table.increments("id");

            table.integer("user_id").references("users.id").notNullable().onDelete("CASCADE");
            table.integer("card_id").references("cards.id").notNullable().onDelete("CASCADE");
            table.integer("count").notNullable().checkBetween([1, 2]);

            table.timestamp("created_at");
            table.timestamp("updated_at");

            table.unique(["user_id", "card_id"]);
            table.index(["user_id"]);
        });

        this.schema.createTable("card_packs", (table) => {
            table.increments("id");

            table.integer("user_id").references("users.id").notNullable().onDelete("CASCADE");
            table.timestamp("opened_at", { useTz: true }).nullable();

            table.timestamp("created_at");
            table.timestamp("updated_at");

            table.index(["user_id"]);
        });
    }

    async down() {
        this.schema.dropTableIfExists("card_packs");
        this.schema.dropTableIfExists("user_cards");
    }
}
