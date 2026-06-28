import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserCard from "#models/user_card";
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

        const nonCollectibleCardIds = (
            await Card.query().select("id").where("isCollectible", false)
        ).map((card) => card.id);

        if (nonCollectibleCardIds.length > 0) {
            await UserCard.query()
                .where("userId", testUser.id)
                .whereIn("cardId", nonCollectibleCardIds)
                .delete();
        }

        const cards = await Card.query().where("rarity", "COMMON").where("isCollectible", true);
        for (const card of cards) {
            await UserCard.updateOrCreate(
                { userId: testUser.id, cardId: card.id },
                { count: getMaxCopiesForRarity(card.rarity) },
            );
        }

        await CardPack.createMany(
            Array.from({ length: TEST_USER_PACK_COUNT }, () => ({ userId: testUser.id })),
        );
    }
}
