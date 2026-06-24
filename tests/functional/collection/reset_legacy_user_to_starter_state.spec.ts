import { STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import { syncCards } from "#database/seed_helpers/sync_cards";
import { GALADRIM_AGGRO_DECK_RECIPE } from "#database/seed_data/balanced_decks";
import CardPack from "#models/card_pack";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import User from "#models/user";
import UserCard from "#models/user_card";
import {
    LEGACY_USER_COMPENSATION_PACK_COUNT,
    resetLegacyUserToStarterState,
} from "#services/collection/reset_legacy_user_to_starter_state";
import { createDeckFromRecipe } from "#services/decks/create_deck_from_recipe";
import { STARTER_DECK_NAME } from "#services/decks/create_starter_deck_for_user";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";

test.group("reset legacy user to starter state", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("resetLegacyUserToStarterState replaces legacy decks with starter state", async ({
        assert,
    }) => {
        await syncCards();

        const user = await User.create({
            email: "legacy-user@test.fr",
            pseudo: "legacy-user",
            password: "test",
        });

        await createDeckFromRecipe({
            userId: user.id,
            name: "Ancien deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });
        await createDeckFromRecipe({
            userId: user.id,
            name: "Ancien deck custom",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: false,
        });

        await resetLegacyUserToStarterState(user.id);

        const decks = await Deck.query().where("userId", user.id).orderBy("id", "asc");
        assert.lengthOf(decks, 1);
        assert.equal(decks[0].name, STARTER_DECK_NAME);
        assert.isTrue(decks[0].selected);

        const deckCards = await DeckCard.query().where("deckId", decks[0].id);
        assert.lengthOf(deckCards, 30);

        const collection = await UserCard.query().where("userId", user.id).orderBy("cardId", "asc");
        assert.lengthOf(collection, STARTER_COLLECTION_RECIPE.length);

        for (const recipeEntry of STARTER_COLLECTION_RECIPE) {
            const row = collection.find((entry) => entry.cardId === recipeEntry.cardId);
            assert.exists(row);
            assert.equal(row!.count, recipeEntry.copies);
        }

        const unopenedPacks = await CardPack.query().where("userId", user.id).whereNull("openedAt");
        assert.lengthOf(unopenedPacks, LEGACY_USER_COMPENSATION_PACK_COUNT);
    });
});
