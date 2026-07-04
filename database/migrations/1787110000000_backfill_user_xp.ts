import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.defer(async () => {
            const { backfillUserXp } = await import("#services/progression/backfill_user_xp");
            await backfillUserXp();
        });
    }

    async down() {
        this.defer(async (db) => {
            await db.from("users").update({ xp: 0 });
        });
    }
}
