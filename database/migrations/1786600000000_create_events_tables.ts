import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "events";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id").notNullable();
            table.string("title").notNullable();
            table.text("short_description").notNullable();
            table.text("long_description").notNullable();
            table.string("image_url").notNullable();
            table.timestamp("starts_at").notNullable();
            table.timestamp("created_at").notNullable();
            table.timestamp("updated_at").nullable();
        });

        this.schema.createTable("event_registrations", (table) => {
            table.increments("id").notNullable();
            table
                .integer("user_id")
                .unsigned()
                .notNullable()
                .references("users.id")
                .onDelete("CASCADE");
            table
                .integer("event_id")
                .unsigned()
                .notNullable()
                .references("events.id")
                .onDelete("CASCADE");
            table.unique(["user_id", "event_id"]);
            table.timestamp("created_at").notNullable();
        });
    }

    async down() {
        this.schema.dropTableIfExists("event_registrations");
        this.schema.dropTableIfExists(this.tableName);
    }
}
