import {
    COLLECTION_MIN_CARDS,
    GOLD_COINS_PER_DUPLICATE_COMMON_SELL,
} from "#api_types/collection.types";
import { getGoldCoinsPerDuplicateSell } from "#api_types/card_rarity.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import { grantStarterCollectionForUser } from "#services/collection/grant_starter_collection_for_user";
import { getTotalCollectionCardCount } from "#services/collection/get_user_collection_counts";
import {
    CollectionTooSmallError,
    sellCardWithGoldCoins,
} from "#services/collection/sell_card_with_gold_coins";
import db from "@adonisjs/lucid/services/db";
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

test.group("sell card with gold coins concurrency", () => {
    test("keeps the minimum collection size under concurrent distinct-card sales", async ({
        assert,
    }) => {
        await syncCards();

        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let userId: number | undefined;
        const userLockReleased = Promise.withResolvers<void>();
        const userLockAcquired = Promise.withResolvers<void>();
        let userLockTransaction: Promise<void> | undefined;

        try {
            const user = await User.create({
                email: `sell-concurrent-${unique}@test.fr`,
                pseudo: "sell-concurrent",
                password: "test",
                goldCoins: 0,
            });
            userId = user.id;

            await grantStarterCollectionForUser(user.id);

            const starterEntries = await UserCard.query().where("userId", user.id);
            assert.isAtLeast(starterEntries.length, 4);

            const extraCards = await Card.query()
                .where("isCollectible", true)
                .whereNotIn(
                    "id",
                    starterEntries.map((entry) => entry.cardId),
                )
                .limit(4);
            assert.lengthOf(extraCards, 4);

            await Promise.all(
                extraCards.map((card) =>
                    UserCard.create({ userId: user.id, cardId: card.id, count: 1 }),
                ),
            );

            const candidateCardIds = [
                ...starterEntries.slice(0, 4).map((entry) => entry.cardId),
                ...extraCards.map((card) => card.id),
            ];
            assert.equal(new Set(candidateCardIds).size, candidateCardIds.length);

            const candidateCards = await Card.query().whereIn("id", candidateCardIds);
            assert.lengthOf(candidateCards, candidateCardIds.length);
            const cardsById = new Map(candidateCards.map((card) => [card.id, card]));

            assert.equal(await getTotalCollectionCardCount(user.id), COLLECTION_MIN_CARDS + 4);

            userLockTransaction = db.transaction(async (trx) => {
                await User.query({ client: trx }).where("id", user.id).forUpdate().firstOrFail();

                userLockAcquired.resolve();
                await userLockReleased.promise;
            });
            await userLockAcquired.promise;

            const sales = Promise.allSettled(
                candidateCardIds.map((cardId) => sellCardWithGoldCoins(user.id, cardId)),
            );

            const waitForConcurrentTransactions = Promise.withResolvers<void>();
            setTimeout(waitForConcurrentTransactions.resolve, 100);
            await waitForConcurrentTransactions.promise;

            userLockReleased.resolve();
            await userLockTransaction;

            const results = await sales;
            const successfulCardIds = results.flatMap((result, index) =>
                result.status === "fulfilled" ? [candidateCardIds[index]] : [],
            );
            const rejectedResults = results.filter(
                (result): result is PromiseRejectedResult => result.status === "rejected",
            );

            assert.lengthOf(successfulCardIds, 4);
            assert.lengthOf(rejectedResults, 4);
            for (const result of rejectedResults) {
                assert.instanceOf(result.reason, CollectionTooSmallError);
            }

            const expectedGoldCoins = successfulCardIds.reduce((total, cardId) => {
                const card = cardsById.get(cardId);
                if (!card) throw new Error(`Missing candidate card ${cardId}`);

                return total + getGoldCoinsPerDuplicateSell(card.rarity);
            }, 0);

            assert.equal(await getTotalCollectionCardCount(user.id), COLLECTION_MIN_CARDS);
            assert.equal((await User.findOrFail(user.id)).goldCoins, expectedGoldCoins);
        } finally {
            userLockReleased.resolve();
            if (userLockTransaction) await userLockTransaction;

            if (userId) {
                await UserCard.query().where("userId", userId).delete();
                await User.query().where("id", userId).delete();
            }
        }
    });
});
