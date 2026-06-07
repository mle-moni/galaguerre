import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.schema.createTable("card_sets", (table) => {
            table.increments("id");
            table.string("name").notNullable().unique();
            table.boolean("is_active").notNullable().defaultTo(true);
            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });
        });

        this.schema.alterTable("cards", (table) => {
            table
                .integer("card_set_id")
                .unsigned()
                .references("card_sets.id")
                .nullable()
                .onDelete("RESTRICT");
        });

        this.defer(async (db) => {
            const now = new Date();

            const [hearthstoneSetId] = await db
                .table("card_sets")
                .insert({ name: "Hearthstone", is_active: true, created_at: now, updated_at: now })
                .returning("id");

            const defaultSetId =
                typeof hearthstoneSetId === "object" && hearthstoneSetId !== null
                    ? (hearthstoneSetId as { id: number }).id
                    : hearthstoneSetId;

            await db.from("cards").update({ card_set_id: defaultSetId });
        });

        this.schema.alterTable("cards", (table) => {
            table.integer("card_set_id").unsigned().notNullable().alter();
            table.dropColumn("card_mode");
        });
    }

    async down() {
        this.schema.alterTable("cards", (table) => {
            table.string("card_mode").notNullable().defaultTo("BETA");
        });

        this.defer(async (db) => {
            await db.from("cards").update({ card_mode: "BETA" });
        });

        this.schema.alterTable("cards", (table) => {
            table.dropColumn("card_set_id");
        });

        this.schema.dropTable("card_sets");
    }
}
