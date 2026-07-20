import {
    getGoldCoinsPerCardBuy,
    getGoldCoinsPerGoldenCardBuy,
    getGoldCoinsPerGoldenUpgrade,
} from "#api_types/card_rarity.types";
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
        assert.deepEqual(result.entry, { cardId: commonCard.id, count: 1, goldenCount: 0 });
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

    test("buys a new golden copy at full golden price", async ({ assert }) => {
        await syncCards();

        const card = await Card.query().where("id", 181).firstOrFail();
        assert.isNotNull(card.data.goldenVideoUrl);

        const price = getGoldCoinsPerGoldenCardBuy(card.rarity);
        const user = await User.create({
            email: "buy-golden-new@test.fr",
            pseudo: "buy-golden-new",
            password: "test",
            goldCoins: price,
        });

        const result = await buyCardWithGoldCoins(user.id, card.id, { golden: true });

        assert.equal(result.goldCoins, 0);
        assert.deepEqual(result.entry, { cardId: card.id, count: 1, goldenCount: 1 });
    });

    test("upgrades a normal copy to golden for the price difference", async ({ assert }) => {
        await syncCards();

        const card = await Card.query().where("id", 181).firstOrFail();
        const upgradePrice = getGoldCoinsPerGoldenUpgrade(card.rarity);
        const user = await User.create({
            email: "buy-golden-upgrade@test.fr",
            pseudo: "buy-golden-upgrade",
            password: "test",
            goldCoins: upgradePrice,
        });

        await UserCard.create({
            userId: user.id,
            cardId: card.id,
            count: 1,
            goldenCount: 0,
        });

        const result = await buyCardWithGoldCoins(user.id, card.id, { golden: true });

        assert.equal(result.goldCoins, 0);
        assert.deepEqual(result.entry, { cardId: card.id, count: 1, goldenCount: 1 });
        assert.equal(
            upgradePrice,
            getGoldCoinsPerGoldenCardBuy(card.rarity) - getGoldCoinsPerCardBuy(card.rarity),
        );
    });

    test("rejects golden buy when card has no golden video", async ({ assert }) => {
        await syncCards();

        const cards = await Card.query().where("isCollectible", true).limit(100).exec();
        const card = cards.find((candidate) => candidate.data.goldenVideoUrl === null);
        assert.isDefined(card);

        const user = await User.create({
            email: "buy-no-golden@test.fr",
            pseudo: "buy-no-golden",
            password: "test",
            goldCoins: getGoldCoinsPerGoldenCardBuy(card!.rarity),
        });

        await assert.rejects(
            () => buyCardWithGoldCoins(user.id, card!.id, { golden: true }),
            /pas de version dorée/,
        );
    });

    test("rejects golden buy when already at max golden copies", async ({ assert }) => {
        await syncCards();

        const card = await Card.query().where("id", 181).firstOrFail();
        const maxCopies = card.rarity === "LEGENDARY" ? 1 : 2;
        const user = await User.create({
            email: "buy-golden-max@test.fr",
            pseudo: "buy-golden-max",
            password: "test",
            goldCoins: getGoldCoinsPerGoldenCardBuy(card.rarity),
        });

        await UserCard.create({
            userId: user.id,
            cardId: card.id,
            count: maxCopies,
            goldenCount: maxCopies,
        });

        await assert.rejects(
            () => buyCardWithGoldCoins(user.id, card.id, { golden: true }),
            /maximum d'exemplaires dorés/,
        );
    });
});
