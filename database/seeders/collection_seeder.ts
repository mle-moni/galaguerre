import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserCard from "#models/user_card";
import { grantStarterCollectionForUser } from "#services/collection/grant_starter_collection_for_user";
import { BaseSeeder } from "@adonisjs/lucid/seeders";

const TEST_USER_EMAILS = ["test@test.fr", "admin@admin.fr"];
const TEST_USER_PACK_COUNT = 5;

export default class extends BaseSeeder {
    async run() {
        const users = await User.all();

        for (const user of users) {
            await grantStarterCollectionForUser(user.id);
        }

        const testUser = users.filter((user) => TEST_USER_EMAILS.includes(user.email));

        if (testUser.length === 0) return;

        const nonCollectibleCardIds = (
            await Card.query().select("id").where("isCollectible", false)
        ).map((card) => card.id);

        if (nonCollectibleCardIds.length > 0) {
            await UserCard.query()
                .whereIn(
                    "userId",
                    testUser.map((user) => user.id),
                )
                .whereIn("cardId", nonCollectibleCardIds)
                .delete();
        }

        const cards = await Card.query()
            // .where("rarity", "COMMON")
            .where("isCollectible", true);
        for (const user of testUser) {
            for (const card of cards) {
                await UserCard.updateOrCreate(
                    { userId: user.id, cardId: card.id },
                    { count: getMaxCopiesForRarity(card.rarity) },
                );
            }
        }

        for (const user of testUser) {
            await CardPack.createMany(
                Array.from({ length: TEST_USER_PACK_COUNT }, () => ({ userId: user.id })),
            );
        }
    }
}
