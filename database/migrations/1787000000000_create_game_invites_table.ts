import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "game_invites";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id").notNullable();
            table
                .integer("from_user_id")
                .unsigned()
                .notNullable()
                .references("users.id")
                .onDelete("CASCADE");
            table
                .integer("to_user_id")
                .unsigned()
                .notNullable()
                .references("users.id")
                .onDelete("CASCADE");
            table.unique(["from_user_id"]);
            table.index(["to_user_id"]);

            table.timestamp("created_at").notNullable();
            table.timestamp("updated_at").nullable();
        });
    }

    async down() {
        this.schema.dropTableIfExists(this.tableName);
    }
}
