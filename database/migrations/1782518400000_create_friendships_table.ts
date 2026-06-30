import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "friendships";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id").notNullable();
            table
                .integer("user_id")
                .unsigned()
                .notNullable()
                .references("users.id")
                .onDelete("CASCADE");
            table
                .integer("friend_id")
                .unsigned()
                .notNullable()
                .references("users.id")
                .onDelete("CASCADE");
            table.unique(["user_id", "friend_id"]);

            table.timestamp("created_at").notNullable();
            table.timestamp("updated_at").nullable();
        });
    }

    async down() {
        this.schema.dropTableIfExists(this.tableName);
    }
}
