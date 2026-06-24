import User from "#models/user";
import CardPack from "#models/card_pack";
import { grantStarterCollectionForUser } from "#services/collection/grant_starter_collection_for_user";
import { BaseSeeder } from "@adonisjs/lucid/seeders";

const TEST_USER_EMAIL = "test@test.fr";
const TEST_USER_PACK_COUNT = 5;

export default class extends BaseSeeder {
    async run() {
        const users = await User.all();

        for (const user of users) {
            await grantStarterCollectionForUser(user.id);
        }

        const testUser = users.find((user) => user.email === TEST_USER_EMAIL);
        if (!testUser) return;

        await CardPack.createMany(
            Array.from({ length: TEST_USER_PACK_COUNT }, () => ({ userId: testUser.id })),
        );
    }
}
