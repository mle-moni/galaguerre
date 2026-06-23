import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { preloadDeckCardSet } from "#controllers/decks/deck_utils";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Deck from "#models/deck";
import User from "#models/user";
import {
    createStarterDeckForUser,
    STARTER_DECK_NAME,
} from "#services/decks/create_starter_deck_for_user";

test.group("starter deck", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("createStarterDeckForUser creates a valid 30-card selected deck", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "starter-deck@test.fr",
            pseudo: "starter-player",
            password: "test",
        });

        await createStarterDeckForUser(user.id);

        const deck = await Deck.query()
            .where("userId", user.id)
            .preload("cards", preloadDeckCardSet)
            .firstOrFail();

        const serialized = serializeDeck(deck);

        assert.equal(deck.name, STARTER_DECK_NAME);
        assert.isTrue(deck.selected);
        assert.equal(serialized.cardCount, 30);
        assert.isTrue(serialized.valid);
        assert.lengthOf(serialized.compositionErrors, 0);
    });
});
