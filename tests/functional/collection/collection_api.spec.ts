import { PACK_SIZE, STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import {
    GOLD_COINS_PER_COMMON_CARD_BUY,
    GOLD_COINS_PER_DUPLICATE_COMMON_SELL,
    type ApiBuyCardResponse,
    type ApiSellDuplicatesResponse,
} from "#api_types/collection.types";
import CollectionController from "#controllers/collection/collection_controller";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserCard from "#models/user_card";
import { grantStarterCollectionForUser } from "#services/collection/grant_starter_collection_for_user";
import { getUserCollectionEntries } from "#services/collection/get_user_collection_counts";
import { openCardPack } from "#services/collection/open_card_pack";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

const createAuthContext = (user: User, body: Record<string, unknown> = {}) => ({
    auth: { user },
    request: {
        validateUsing: async () => body,
    },
    response: {
        badRequest: (payload: unknown) => payload,
    },
});

test.group("collection api", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("getUserCollectionEntries returns owned cards", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "collection-api@test.fr",
            pseudo: "collection-api",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);

        const entries = await getUserCollectionEntries(user.id);

        assert.lengthOf(entries, STARTER_COLLECTION_RECIPE.length);
        assert.equal(
            entries.reduce((sum, entry) => sum + entry.count, 0),
            30,
        );
    });

    test("CollectionController.packs returns unopened pack count", async ({ assert }) => {
        const user = await User.create({
            email: "packs-api@test.fr",
            pseudo: "packs-api",
            password: "test",
        });

        await CardPack.createMany([{ userId: user.id }, { userId: user.id }, { userId: user.id }]);

        const controller = new CollectionController();
        const result = await controller.packs(createAuthContext(user) as never);

        assert.equal(result.unopenedCount, 3);
    });

    test("openCardPack updates collection and marks pack as opened", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "packs-open-api@test.fr",
            pseudo: "packs-open-api",
            password: "test",
        });

        await grantStarterCollectionForUser(user.id);
        await CardPack.create({ userId: user.id });

        const cards = await openCardPack(user.id);

        assert.lengthOf(cards, PACK_SIZE);

        const unopened = await CardPack.query()
            .where("userId", user.id)
            .whereNull("openedAt")
            .count("* as total");
        assert.equal(Number(unopened[0].$extras.total), 0);

        const ownedRows = await UserCard.query().where("userId", user.id);
        const totalOwned = ownedRows.reduce((sum, row) => sum + row.count, 0);
        assert.equal(totalOwned, 35);
    });

    test("CollectionController.openPack returns 400 when no pack is available", async ({
        assert,
    }) => {
        const user = await User.create({
            email: "packs-open-empty@test.fr",
            pseudo: "packs-open-empty",
            password: "test",
        });

        const controller = new CollectionController();
        const result = await controller.openPack(createAuthContext(user) as never);

        assert.deepEqual(result, { error: "Aucun paquet à ouvrir" });
    });

    test("CollectionController.duplicatesPreview returns sellable duplicates", async ({
        assert,
    }) => {
        await syncCards();

        const user = await User.create({
            email: "duplicates-preview@test.fr",
            pseudo: "duplicates-preview",
            password: "test",
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();
        await UserCard.create({ userId: user.id, cardId: commonCard.id, count: 3 });

        const controller = new CollectionController();
        const result = await controller.duplicatesPreview(createAuthContext(user) as never);

        assert.equal(result.totalGoldCoins, GOLD_COINS_PER_DUPLICATE_COMMON_SELL);
        assert.lengthOf(result.lines, 1);
    });

    test("CollectionController.sellDuplicates credits story points", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "sell-duplicates-api@test.fr",
            pseudo: "sell-duplicates-api",
            password: "test",
            goldCoins: 10,
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();
        await UserCard.create({ userId: user.id, cardId: commonCard.id, count: 3 });

        const controller = new CollectionController();
        const result = (await controller.sellDuplicates(
            createAuthContext(user) as never,
        )) as ApiSellDuplicatesResponse;

        assert.equal(result.goldCoins, 10 + GOLD_COINS_PER_DUPLICATE_COMMON_SELL);
        assert.equal(result.entries.find((entry) => entry.cardId === commonCard.id)?.count, 2);
    });

    test("CollectionController.buyCard purchases a collectible card", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "buy-card-api@test.fr",
            pseudo: "buy-card-api",
            password: "test",
            goldCoins: GOLD_COINS_PER_COMMON_CARD_BUY,
        });

        const commonCard = await Card.query()
            .where("isCollectible", true)
            .where("rarity", "COMMON")
            .firstOrFail();

        const controller = new CollectionController();
        const result = (await controller.buyCard(
            createAuthContext(user, { cardId: commonCard.id }) as never,
        )) as ApiBuyCardResponse;

        assert.equal(result.goldCoins, 0);
        assert.deepEqual(result.entry, { cardId: commonCard.id, count: 1 });
    });
});
