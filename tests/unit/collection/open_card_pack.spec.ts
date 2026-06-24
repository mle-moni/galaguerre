import { PACK_SIZE, STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserCard from "#models/user_card";
import {
    grantCardCopiesForUser,
    grantStarterCollectionForUser,
} from "#services/collection/grant_starter_collection_for_user";
import { openCardPack } from "#services/collection/open_card_pack";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("open card pack", (group) => {
    group.setup(() => testUtils.db().migrate());
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("opens a pack with 5 distinct eligible cards and increments collection", async ({
        assert,
    }) => {
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

        const ownedAfter = await UserCard.query().where("userId", user.id);
        const cardsById = new Map((await Card.query()).map((card) => [card.id, card]));
        for (const row of ownedAfter) {
            const maxCopies = getMaxCopiesForRarity(cardsById.get(row.cardId)!.rarity);
            assert.isAtMost(row.count, maxCopies);
        }

        const openedPack = await CardPack.query().where("userId", user.id).firstOrFail();
        assert.isNotNull(openedPack.openedAt);
    });

    test("never draws cards already owned at max copies", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-eligible@test.fr",
            pseudo: "pack-eligible",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);
        await CardPack.create({ userId: user.id });

        const starterCardIds = new Set(STARTER_COLLECTION_RECIPE.map((entry) => entry.cardId));
        const cards = await openCardPack(user.id);

        for (const card of cards) {
            assert.notInclude([...starterCardIds], card.id);
        }
    });

    test("never draws legendary cards already owned at max copies", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "pack-legendary@test.fr",
            pseudo: "pack-legendary",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);

        const legendaryCards = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "LEGENDARY");

        for (const card of legendaryCards) {
            await grantCardCopiesForUser(user.id, card.id, 1);
        }

        await CardPack.create({ userId: user.id });

        const cards = await openCardPack(user.id);
        const drawnIds = new Set(cards.map((card) => card.id));

        for (const legendary of legendaryCards) {
            assert.notInclude([...drawnIds], legendary.id);
        }
    });

    test("caps legendary cards at one copy when granting", async ({ assert }) => {
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

    test("throws when not enough eligible cards remain", async ({ assert }) => {
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

        await assert.rejects(() => openCardPack(user.id), /Collection complète/);
    });
});
