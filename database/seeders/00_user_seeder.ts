import User from "#models/user";
import { BaseSeeder } from "@adonisjs/lucid/seeders";

export default class extends BaseSeeder {
    async run() {
        await User.createMany([
            { pseudo: "admin", email: "admin@admin.fr", password: "test", isSuperAdmin: true },
            { pseudo: "test", email: "test@test.fr", password: "test" },
        ]);
    }
}
