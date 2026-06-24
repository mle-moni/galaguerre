import { PACK_SIZE, STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import CollectionController from "#controllers/collection/collection_controller";
import { syncCards } from "#database/seed_helpers/sync_cards";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserCard from "#models/user_card";
import { grantStarterCollectionForUser } from "#services/collection/grant_starter_collection_for_user";
import { getUserCollectionEntries } from "#services/collection/get_user_collection_counts";
import { openCardPack } from "#services/collection/open_card_pack";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

const createAuthContext = (user: User) => ({
    auth: { user },
    response: {
        badRequest: (body: unknown) => body,
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
});
