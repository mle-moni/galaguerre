import { getGoldCoinsPerCardBuy, getPackGoldenChanceForRarity } from "#api_types/card_rarity.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import { grantPackCardCopyForUser } from "#services/collection/grant_starter_collection_for_user";
import { sellCardWithGoldCoins } from "#services/collection/sell_card_with_gold_coins";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("golden collection grants", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("grantPackCardCopyForUser can roll a golden copy when video exists", async ({
        assert,
    }) => {
        await syncCards();

        const user = await User.create({
            email: "golden-pack@test.fr",
            pseudo: "golden-pack",
            password: "test",
        });

        const card = await Card.query().where("id", 181).firstOrFail();
        assert.isNotNull(card.data.goldenVideoUrl);

        const { isGolden } = await grantPackCardCopyForUser(user.id, card.id, undefined, {
            forceGolden: true,
        });

        assert.isTrue(isGolden);

        const owned = await UserCard.query()
            .where({ userId: user.id, cardId: card.id })
            .firstOrFail();
        assert.equal(owned.count, 1);
        assert.equal(owned.goldenCount, 1);
    });

    test("grantPackCardCopyForUser rolls golden using per-rarity pack chance", async ({
        assert,
    }) => {
        await syncCards();

        const user = await User.create({
            email: "golden-rarity-roll@test.fr",
            pseudo: "golden-rarity-roll",
            password: "test",
        });

        const legendaryCards = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "LEGENDARY")
            .exec();
        const card = legendaryCards.find((candidate) => candidate.data.goldenVideoUrl !== null);
        assert.isDefined(card);
        const legendaryChance = getPackGoldenChanceForRarity("LEGENDARY");

        const golden = await grantPackCardCopyForUser(user.id, card!.id, undefined, {
            random: () => legendaryChance - 0.001,
        });
        assert.isTrue(golden.isGolden);

        const user2 = await User.create({
            email: "golden-rarity-miss@test.fr",
            pseudo: "golden-rarity-miss",
            password: "test",
        });

        const miss = await grantPackCardCopyForUser(user2.id, card!.id, undefined, {
            random: () => legendaryChance + 0.001,
        });
        assert.isFalse(miss.isGolden);
    });

    test("grantPackCardCopyForUser does not golden when card has no video", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "no-golden@test.fr",
            pseudo: "no-golden",
            password: "test",
        });

        const cards = await Card.query().where("isCollectible", true).limit(100).exec();
        const card = cards.find((candidate) => candidate.data.goldenVideoUrl === null);
        assert.isDefined(card);
        assert.isNull(card!.data.goldenVideoUrl);

        const { isGolden } = await grantPackCardCopyForUser(user.id, card!.id, undefined, {
            forceGolden: true,
        });

        assert.isFalse(isGolden);

        const owned = await UserCard.query()
            .where({ userId: user.id, cardId: card!.id })
            .firstOrFail();
        assert.equal(owned.goldenCount, 0);
    });

    test("sell prefers normal copies before golden ones", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-golden@test.fr",
            pseudo: "sell-golden",
            password: "test",
            goldCoins: 0,
        });

        const card = await Card.query().where("id", 181).firstOrFail();

        // Ensure collection stays above COLLECTION_MIN_CARDS after one sell
        const filler = await Card.query()
            .where("isCollectible", true)
            .whereNot("id", 181)
            .limit(40)
            .exec();
        for (const fillerCard of filler) {
            await UserCard.create({
                userId: user.id,
                cardId: fillerCard.id,
                count: 1,
                goldenCount: 0,
            });
        }

        await UserCard.create({
            userId: user.id,
            cardId: card.id,
            count: 2,
            goldenCount: 1,
        });

        await sellCardWithGoldCoins(user.id, card.id);

        const owned = await UserCard.query()
            .where({ userId: user.id, cardId: card.id })
            .firstOrFail();
        assert.equal(owned.count, 1);
        assert.equal(owned.goldenCount, 1);
    });

    test("selling a golden copy refunds the normal craft price", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-golden-price@test.fr",
            pseudo: "sell-golden-price",
            password: "test",
            goldCoins: 0,
        });

        const card = await Card.query().where("id", 181).firstOrFail();

        const filler = await Card.query()
            .where("isCollectible", true)
            .whereNot("id", 181)
            .limit(40)
            .exec();
        for (const fillerCard of filler) {
            await UserCard.create({
                userId: user.id,
                cardId: fillerCard.id,
                count: 1,
                goldenCount: 0,
            });
        }

        await UserCard.create({
            userId: user.id,
            cardId: card.id,
            count: 1,
            goldenCount: 1,
        });

        const result = await sellCardWithGoldCoins(user.id, card.id);

        assert.equal(result.goldCoins, getGoldCoinsPerCardBuy(card.rarity));
        assert.isNull(result.entry);
    });
});
