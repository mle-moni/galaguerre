import { PACK_SIZE, STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserCard from "#models/user_card";
import {
    grantCardCopiesForUser,
    grantPackCardCopyForUser,
    grantStarterCollectionForUser,
} from "#services/collection/grant_starter_collection_for_user";
import { openCardPack } from "#services/collection/open_card_pack";
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
