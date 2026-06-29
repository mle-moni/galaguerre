import {
    GOLD_COINS_PER_DUPLICATE_COMMON_SELL,
    GOLD_COINS_PER_DUPLICATE_LEGENDARY_SELL,
} from "#api_types/collection.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import {
    computeDuplicatesSellPreview,
    sellAllDuplicateCards,
} from "#services/collection/sell_duplicate_cards";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("sell duplicate cards", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("preview lists only excess copies above deck max", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-preview@test.fr",
            pseudo: "sell-preview",
            password: "test",
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();
        const legendaryCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "LEGENDARY")
            .firstOrFail();

        await UserCard.create({ userId: user.id, cardId: commonCard.id, count: 3 });
        await UserCard.create({ userId: user.id, cardId: legendaryCard.id, count: 2 });

        const preview = await computeDuplicatesSellPreview(user.id);

        assert.equal(
            preview.totalGoldCoins,
            GOLD_COINS_PER_DUPLICATE_COMMON_SELL + GOLD_COINS_PER_DUPLICATE_LEGENDARY_SELL,
        );
        assert.lengthOf(preview.lines, 2);
    });

    test("sellAllDuplicateCards credits gold and reduces counts to deck max", async ({
        assert,
    }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-all@test.fr",
            pseudo: "sell-all",
            password: "test",
            goldCoins: 0,
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();

        await UserCard.create({ userId: user.id, cardId: commonCard.id, count: 4 });

        const result = await sellAllDuplicateCards(user.id);

        assert.equal(result.goldCoins, GOLD_COINS_PER_DUPLICATE_COMMON_SELL * 2);

        const refreshedUser = await User.findOrFail(user.id);
        assert.equal(refreshedUser.goldCoins, GOLD_COINS_PER_DUPLICATE_COMMON_SELL * 2);

        const owned = await UserCard.query()
            .where("userId", user.id)
            .where("cardId", commonCard.id)
            .firstOrFail();
        assert.equal(owned.count, 2);

        const entry = result.entries.find((row) => row.cardId === commonCard.id);
        assert.equal(entry?.count, 2);
    });

    test("sellAllDuplicateCards rejects when there are no duplicates", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-none@test.fr",
            pseudo: "sell-none",
            password: "test",
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();
        await UserCard.create({ userId: user.id, cardId: commonCard.id, count: 2 });

        await assert.rejects(() => sellAllDuplicateCards(user.id), /Aucun doublon/);
    });
});
