import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "cards";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.string("label").notNullable();
            table.string("image_url").notNullable();
            table.integer("cost").notNullable();
            table.string("type").notNullable();

            table.string("card_mode").notNullable();

            table.integer("minion_id").references("minions.id").nullable().onDelete("SET NULL");

            table.integer("spell_id").references("spells.id").nullable().onDelete("SET NULL");

            table.integer("weapon_id").references("weapons.id").nullable().onDelete("SET NULL");

            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
