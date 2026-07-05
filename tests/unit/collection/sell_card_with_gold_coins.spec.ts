import { GOLD_COINS_PER_DUPLICATE_COMMON_SELL } from "#api_types/collection.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import { grantStarterCollectionForUser } from "#services/collection/grant_starter_collection_for_user";
import { sellCardWithGoldCoins } from "#services/collection/sell_card_with_gold_coins";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("sell card with gold coins", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("sells one copy and credits gold", async ({ assert }) => {
        await syncCards();

        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `sell-one-${unique}@test.fr`,
            pseudo: "sell-one",
            password: "test",
            goldCoins: 0,
        });

        await grantStarterCollectionForUser(user.id);

        const ownedCardIds = (await UserCard.query().where("userId", user.id)).map(
            (row) => row.cardId,
        );
        const commonCard = await Card.query()
            .whereIn("id", ownedCardIds)
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();

        const existing = await UserCard.query()
            .where({ userId: user.id, cardId: commonCard.id })
            .firstOrFail();
        const previousCount = existing.count;
        existing.count = previousCount + 1;
        await existing.save();

        const result = await sellCardWithGoldCoins(user.id, commonCard.id);

        assert.equal(result.goldCoins, GOLD_COINS_PER_DUPLICATE_COMMON_SELL);
        assert.equal(result.entry?.count, previousCount);

        const refreshedUser = await User.findOrFail(user.id);
        assert.equal(refreshedUser.goldCoins, GOLD_COINS_PER_DUPLICATE_COMMON_SELL);
    });

    test("sells the last owned copy and removes the collection entry", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-last@test.fr",
            pseudo: "sell-last",
            password: "test",
            goldCoins: 0,
        });

        const cards = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .limit(16);
        assert.isAtLeast(cards.length, 16);

        const [soloCard, ...bulkCards] = cards;
        await UserCard.create({ userId: user.id, cardId: soloCard.id, count: 1 });

        for (const card of bulkCards.slice(0, 15)) {
            await UserCard.create({ userId: user.id, cardId: card.id, count: 2 });
        }

        const result = await sellCardWithGoldCoins(user.id, soloCard.id);

        assert.isNull(result.entry);

        const owned = await UserCard.query()
            .where({ userId: user.id, cardId: soloCard.id })
            .first();
        assert.isNull(owned);
    });

    test("rejects selling when collection would drop below minimum", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-min@test.fr",
            pseudo: "sell-min",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);

        const ownedCard = await UserCard.query().where("userId", user.id).firstOrFail();

        await assert.rejects(
            () => sellCardWithGoldCoins(user.id, ownedCard.cardId),
            /au moins 30 cartes/,
        );
    });

    test("rejects selling a card the user does not own", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-missing@test.fr",
            pseudo: "sell-missing",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);

        const unownedCard = await Card.query()
            .where("isCollectible", true)
            .whereNotIn(
                "id",
                (await UserCard.query().where("userId", user.id)).map((row) => row.cardId),
            )
            .firstOrFail();

        await assert.rejects(
            () => sellCardWithGoldCoins(user.id, unownedCard.id),
            /ne possédez pas cette carte/,
        );
    });
});
