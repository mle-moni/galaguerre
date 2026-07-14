import { PACK_SIZE, STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserDailyQuest from "#models/user_daily_quest";
import UserCard from "#models/user_card";
import {
    grantCardCopiesForUser,
    grantPackCardCopyForUser,
    grantStarterCollectionForUser,
} from "#services/collection/grant_starter_collection_for_user";
import { NoUnopenedPackError, openCardPack } from "#services/collection/open_card_pack";
import { getOrGenerateDailyQuests } from "#services/daily_quests/get_or_generate_daily_quests";
import {
    getParisCalendarDate,
    parseParisCalendarDate,
} from "#services/rewards/get_paris_calendar_date";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("open card pack", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("opens a pack with 5 distinct cards and increments collection", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-open@test.fr",
            pseudo: "pack-open",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);
        await CardPack.create({ userId: user.id });

        const cards = await openCardPack(user.id);

        assert.lengthOf(cards, PACK_SIZE);
        const drawnIds = cards.map((card) => card.id);
        assert.equal(new Set(drawnIds).size, PACK_SIZE);

        const openedPack = await CardPack.query().where("userId", user.id).firstOrFail();
        assert.isNotNull(openedPack.openedAt);
    });

    test("can draw cards already owned at max deck copies", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-duplicates@test.fr",
            pseudo: "pack-duplicates",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);

        const starterCardIds = new Set(STARTER_COLLECTION_RECIPE.map((entry) => entry.cardId));
        let drewOwnedStarterCard = false;

        for (let attempt = 0; attempt < 30 && !drewOwnedStarterCard; attempt += 1) {
            await CardPack.create({ userId: user.id });
            const cards = await openCardPack(user.id);
            assert.lengthOf(cards, PACK_SIZE);
            drewOwnedStarterCard = cards.some((card) => starterCardIds.has(card.id));
        }

        assert.isTrue(drewOwnedStarterCard);
    });

    test("grantPackCardCopyForUser allows counts above deck max copies", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "grant-pack-copy@test.fr",
            pseudo: "grant-pack-copy",
            password: "test",
        });

        const fanny = await Card.findByOrFail("id", 136);

        await grantPackCardCopyForUser(user.id, fanny.id);
        await grantPackCardCopyForUser(user.id, fanny.id);

        const owned = await UserCard.query()
            .where("userId", user.id)
            .where("cardId", fanny.id)
            .firstOrFail();

        assert.equal(owned.count, 2);
    });

    test("grantCardCopiesForUser still caps legendary cards at one copy", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "grant-legendary@test.fr",
            pseudo: "grant-legendary",
            password: "test",
        });

        const fanny = await Card.findByOrFail("id", 136);

        await grantCardCopiesForUser(user.id, fanny.id, 1);
        await grantCardCopiesForUser(user.id, fanny.id, 1);

        const owned = await UserCard.query()
            .where("userId", user.id)
            .where("cardId", fanny.id)
            .firstOrFail();

        assert.equal(owned.count, 1);
    });

    test("throws when user has no unopened pack", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-none@test.fr",
            pseudo: "pack-none",
            password: "test",
        });

        await assert.rejects(() => openCardPack(user.id), /Aucun paquet/);
    });

    test("opens a pack when collection is complete at deck max copies", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-complete@test.fr",
            pseudo: "pack-complete",
            password: "test",
        });

        const collectibleCards = await Card.query().where("isCollectible", true);
        for (const card of collectibleCards) {
            const maxCopies = getMaxCopiesForRarity(card.rarity);
            await UserCard.create({ userId: user.id, cardId: card.id, count: maxCopies });
        }

        await CardPack.create({ userId: user.id });

        const ownedBefore = (await UserCard.query().where("userId", user.id)).reduce(
            (sum, row) => sum + row.count,
            0,
        );

        const cards = await openCardPack(user.id);
        assert.lengthOf(cards, PACK_SIZE);

        const ownedAfter = (await UserCard.query().where("userId", user.id)).reduce(
            (sum, row) => sum + row.count,
            0,
        );
        assert.equal(ownedAfter, ownedBefore + PACK_SIZE);
    });
});

test.group("open card pack concurrency", (group) => {
    group.each.teardown(async () => {
        await User.query()
            .whereIn("email", [
                "pack-concurrent-daily-quests@test.fr",
                "pack-concurrent-quest-progress@test.fr",
            ])
            .delete();
    });
    test("opens every available pack concurrently without duplicating daily quests", async ({
        assert,
    }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-concurrent-daily-quests@test.fr",
            pseudo: "pack-concurrent-daily-quests",
            password: "test",
        });
        await grantStarterCollectionForUser(user.id);
        await CardPack.createMany([{ userId: user.id }, { userId: user.id }]);

        const ownedBefore = (await UserCard.query().where("userId", user.id)).reduce(
            (sum, row) => sum + row.count,
            0,
        );
        const results = await Promise.allSettled(
            Array.from({ length: 4 }, () => openCardPack(user.id)),
        );
        const fulfilled = results.filter((result) => result.status === "fulfilled");
        const rejected = results.filter((result) => result.status === "rejected");

        assert.lengthOf(fulfilled, 2);
        assert.lengthOf(rejected, 2);
        for (const result of results) {
            if (result.status === "fulfilled") {
                assert.lengthOf(result.value, PACK_SIZE);
            } else {
                assert.instanceOf(result.reason, NoUnopenedPackError);
            }
        }

        const ownedAfter = (await UserCard.query().where("userId", user.id)).reduce(
            (sum, row) => sum + row.count,
            0,
        );
        assert.equal(ownedAfter, ownedBefore + 2 * PACK_SIZE);

        const packs = await CardPack.query().where("userId", user.id);
        assert.lengthOf(
            packs.filter((pack) => pack.openedAt),
            2,
        );
        assert.lengthOf(
            packs.filter((pack) => !pack.openedAt),
            0,
        );

        const dailyQuests = await UserDailyQuest.query()
            .where("userId", user.id)
            .where("questDate", getParisCalendarDate())
            .orderBy("slot", "asc");
        assert.lengthOf(dailyQuests, 3);
        assert.deepEqual(
            dailyQuests.map((quest) => quest.slot),
            [0, 1, 2],
        );

        const canonicalQuests = await getOrGenerateDailyQuests(user.id);
        assert.deepEqual(
            canonicalQuests.map((quest) => quest.id),
            dailyQuests.map((quest) => quest.id),
        );
    });

    test("preserves every concurrent pack-open quest increment", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-concurrent-quest-progress@test.fr",
            pseudo: "pack-concurrent-quest-progress",
            password: "test",
        });
        const questDate = parseParisCalendarDate(getParisCalendarDate());
        await UserDailyQuest.createMany([
            {
                userId: user.id,
                questDate,
                slot: 0,
                questType: "WIN_GAME",
                targetValue: 1,
                progress: 0,
                params: null,
                rewardType: "pack",
                rewardAmount: 1,
            },
            {
                userId: user.id,
                questDate,
                slot: 1,
                questType: "OPEN_PACK",
                targetValue: 3,
                progress: 0,
                params: null,
                rewardType: "story_points",
                rewardAmount: 50,
            },
            {
                userId: user.id,
                questDate,
                slot: 2,
                questType: "DEAL_DAMAGE",
                targetValue: 60,
                progress: 0,
                params: null,
                rewardType: "story_points",
                rewardAmount: 50,
            },
        ]);
        await CardPack.createMany([{ userId: user.id }, { userId: user.id }]);

        const results = await Promise.allSettled([openCardPack(user.id), openCardPack(user.id)]);

        assert.lengthOf(
            results.filter((result) => result.status === "fulfilled"),
            2,
        );
        assert.lengthOf(
            results.filter((result) => result.status === "rejected"),
            0,
        );

        const openPackQuest = await UserDailyQuest.query()
            .where("userId", user.id)
            .where("questType", "OPEN_PACK")
            .firstOrFail();
        assert.equal(openPackQuest.progress, 2);
    });
});
