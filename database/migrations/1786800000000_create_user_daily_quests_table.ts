import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "user_daily_quests";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.integer("user_id").references("users.id").notNullable().onDelete("CASCADE");
            table.date("quest_date").notNullable();
            table.tinyint("slot").notNullable();
            table.string("quest_type", 32).notNullable();
            table.integer("target_value").notNullable();
            table.integer("progress").notNullable().defaultTo(0);
            table.jsonb("params").nullable();
            table.string("reward_type", 16).notNullable();
            table.integer("reward_amount").notNullable();
            table.timestamp("completed_at", { useTz: true }).nullable();
            table.timestamp("claimed_at", { useTz: true }).nullable();

            table.timestamp("created_at");
            table.timestamp("updated_at");

            table.unique(["user_id", "quest_date", "slot"]);
            table.index(["user_id", "quest_date"]);
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
