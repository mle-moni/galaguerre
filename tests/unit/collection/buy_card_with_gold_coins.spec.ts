import {
    GOLD_COINS_PER_COMMON_CARD_BUY,
    GOLD_COINS_PER_LEGENDARY_CARD_BUY,
} from "#api_types/collection.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import { buyCardWithGoldCoins } from "#services/collection/buy_card_with_gold_coins";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("buy card with gold coins", (group) => {
    group.setup(() => testUtils.db().migrate());
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("buys a missing common card", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "buy-common@test.fr",
            pseudo: "buy-common",
            password: "test",
            goldCoins: GOLD_COINS_PER_COMMON_CARD_BUY,
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();

        const result = await buyCardWithGoldCoins(user.id, commonCard.id);

        assert.equal(result.goldCoins, 0);
        assert.deepEqual(result.entry, { cardId: commonCard.id, count: 1 });
    });

    test("buys a second common copy", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "buy-common-2@test.fr",
            pseudo: "buy-common-2",
            password: "test",
            goldCoins: GOLD_COINS_PER_COMMON_CARD_BUY,
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();
        await UserCard.create({ userId: user.id, cardId: commonCard.id, count: 1 });

        const result = await buyCardWithGoldCoins(user.id, commonCard.id);

        assert.equal(result.entry.count, 2);
    });

    test("rejects buying a legendary card already owned", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "buy-legendary@test.fr",
            pseudo: "buy-legendary",
            password: "test",
            goldCoins: GOLD_COINS_PER_LEGENDARY_CARD_BUY,
        });

        const legendaryCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "LEGENDARY")
            .firstOrFail();
        await UserCard.create({ userId: user.id, cardId: legendaryCard.id, count: 1 });

        await assert.rejects(
            () => buyCardWithGoldCoins(user.id, legendaryCard.id),
            /maximum d'exemplaires/,
        );
    });

    test("rejects buying when user lacks gold coins", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "buy-poor@test.fr",
            pseudo: "buy-poor",
            password: "test",
            goldCoins: GOLD_COINS_PER_COMMON_CARD_BUY - 1,
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();

        await assert.rejects(() => buyCardWithGoldCoins(user.id, commonCard.id), /story points/);
    });
});
