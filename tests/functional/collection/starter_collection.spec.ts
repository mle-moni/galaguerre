import { STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import User from "#models/user";
import UserCard from "#models/user_card";
import { createStarterDeckForUser } from "#services/decks/create_starter_deck_for_user";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("starter collection", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("createStarterDeckForUser grants the starter collection", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "starter-collection@test.fr",
            pseudo: "starter-collection",
            password: "test",
        });

        await createStarterDeckForUser(user.id);

        const rows = await UserCard.query().where("userId", user.id).orderBy("cardId", "asc");

        assert.lengthOf(rows, STARTER_COLLECTION_RECIPE.length);

        for (const recipeEntry of STARTER_COLLECTION_RECIPE) {
            const row = rows.find((entry) => entry.cardId === recipeEntry.cardId);
            assert.exists(row);
            assert.equal(row!.count, recipeEntry.copies);
        }
    });
});
