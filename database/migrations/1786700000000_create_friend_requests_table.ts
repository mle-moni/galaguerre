import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "friend_requests";

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
            table.unique(["from_user_id", "to_user_id"]);
            table.index(["to_user_id"]);

            table.timestamp("created_at").notNullable();
            table.timestamp("updated_at").nullable();
        });

        this.defer(async (db) => {
            const friendships = await db.from("friendships").select("user_id", "friend_id");

            for (const friendship of friendships) {
                const reciprocal = friendships.find(
                    (entry) =>
                        entry.user_id === friendship.friend_id &&
                        entry.friend_id === friendship.user_id,
                );

                if (!reciprocal) {
                    const now = new Date();
                    await db.table("friend_requests").insert({
                        from_user_id: friendship.user_id,
                        to_user_id: friendship.friend_id,
                        created_at: now,
                        updated_at: now,
                    });
                    await db
                        .from("friendships")
                        .where("user_id", friendship.user_id)
                        .where("friend_id", friendship.friend_id)
                        .delete();
                }
            }
        });
    }

    async down() {
        this.schema.dropTableIfExists(this.tableName);
    }
}
