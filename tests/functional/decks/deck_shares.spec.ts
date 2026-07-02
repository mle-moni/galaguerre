import DeckSharesController from "#controllers/deck_shares/deck_shares_controller";
import { serializeDeckShare } from "#controllers/deck_shares/serialize_deck_share";
import type { ApiDeckShare, CreateDeckShareResponse } from "#api_types/deck_share.types";
import type { ImportDeckResponse } from "#api_types/deck_share.types";
import { syncDeckCards } from "#controllers/decks/deck_utils";
import { syncCards } from "#database/seed_helpers/sync_cards";
import { GALADRIM_AGGRO_DECK_RECIPE } from "#database/seed_data/balanced_decks";
import Deck from "#models/deck";
import DeckShare from "#models/deck_share";
import User from "#models/user";
import { createDeckFromRecipe } from "#services/decks/create_deck_from_recipe";
import { createDeckShare } from "#services/decks/create_deck_share";
import {
    grantCardCopiesForUser,
    grantStarterCollectionForUser,
} from "#services/collection/grant_starter_collection_for_user";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";

const createUser = async (suffix: string) =>
    User.create({
        email: `deck-share-${suffix}@test.fr`,
        pseudo: `player-${suffix}`,
        password: "test",
    });

const createContext = (
    user: User | null,
    {
        body = {},
        params = {},
    }: {
        body?: Record<string, unknown>;
        params?: Record<string, unknown>;
    } = {},
) => {
    let badRequestBody: unknown;
    let notFoundBody: unknown;

    const ctx = {
        auth: user ? { user } : { user: null },
        request: {
            validateUsing: async () => body,
        },
        params,
        response: {
            badRequest: (payload: unknown) => {
                badRequestBody = payload;
                return payload;
            },
            notFound: (payload: unknown) => {
                notFoundBody = payload;
                return payload;
            },
        },
    } as unknown as HttpContext;

    return {
        ctx,
        getBadRequestBody: () => badRequestBody,
        getNotFoundBody: () => notFoundBody,
    };
};

test.group("deck shares", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("createDeckShare snapshots the saved deck composition", async ({ assert }) => {
        await syncCards();

        const user = await createUser("owner");
        const deck = await createDeckFromRecipe({
            userId: user.id,
            name: "Deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });

        const share = await createDeckShare({ userId: user.id, deckId: deck.id });

        assert.lengthOf(share.code, 8);
        assert.equal(share.name, "Deck aggro");
        assert.equal(share.userId, user.id);
        assert.equal(share.deckId, deck.id);
        assert.equal(
            share.cards.reduce((sum, entry) => sum + entry.count, 0),
            30,
        );
    });

    test("serializeDeckShare exposes author and validity", async ({ assert }) => {
        await syncCards();

        const user = await createUser("serialize");
        const deck = await createDeckFromRecipe({
            userId: user.id,
            name: "Deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });

        const share = await createDeckShare({ userId: user.id, deckId: deck.id });
        await share.load("user");

        const serialized = await serializeDeckShare(share);

        assert.equal(serialized.code, share.code);
        assert.equal(serialized.name, "Deck aggro");
        assert.equal(serialized.authorUserId, user.id);
        assert.equal(serialized.authorPseudo, user.pseudo);
        assert.equal(serialized.cardCount, 30);
        assert.isTrue(serialized.valid);
    });

    test("DeckSharesController.show returns a public snapshot", async ({ assert }) => {
        await syncCards();

        const user = await createUser("show");
        const deck = await createDeckFromRecipe({
            userId: user.id,
            name: "Deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });
        const share = await createDeckShare({ userId: user.id, deckId: deck.id });

        const controller = new DeckSharesController();
        const { ctx } = createContext(null, { params: { code: share.code } });
        const result = (await controller.show(ctx)) as ApiDeckShare;

        assert.equal(result.code, share.code);
        assert.equal(result.cardCount, 30);
    });

    test("DeckSharesController.store creates a share link for the deck owner", async ({
        assert,
    }) => {
        await syncCards();

        const user = await createUser("store");
        const deck = await createDeckFromRecipe({
            userId: user.id,
            name: "Deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });

        const controller = new DeckSharesController();
        const { ctx } = createContext(user, { params: { deckId: deck.id } });
        const result = (await controller.store(ctx)) as CreateDeckShareResponse;

        assert.equal(result.url, `/decks/s/${result.code}`);

        const stored = await DeckShare.findBy("code", result.code);
        assert.isNotNull(stored);
    });

    test("DeckSharesController.import creates a deck for a user with the required cards", async ({
        assert,
    }) => {
        await syncCards();

        const owner = await createUser("owner-import");
        const importer = await createUser("importer");
        await grantStarterCollectionForUser(importer.id);

        const deck = await createDeckFromRecipe({
            userId: owner.id,
            name: "Deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });
        const share = await createDeckShare({ userId: owner.id, deckId: deck.id });

        const controller = new DeckSharesController();
        const { ctx } = createContext(importer, {
            body: { shareCode: share.code },
        });
        const result = (await controller.import(ctx)) as ImportDeckResponse;

        assert.equal(result.deck.cardCount, 30);
        assert.isTrue(result.deck.valid);
        assert.include(result.deck.name, "Deck aggro");
        assert.include(result.deck.name, owner.pseudo!);
    });

    test("DeckSharesController.import partially imports when user is missing cards", async ({
        assert,
    }) => {
        await syncCards();

        const owner = await createUser("owner-partial");
        const importer = await createUser("importer-partial");

        const deck = await createDeckFromRecipe({
            userId: owner.id,
            name: "Deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });
        const share = await createDeckShare({ userId: owner.id, deckId: deck.id });

        const skippedEntry = share.cards[0]!;
        const expectedImportedCount = share.cards
            .slice(1)
            .reduce((sum, entry) => sum + entry.count, 0);

        for (const entry of share.cards.slice(1)) {
            await grantCardCopiesForUser(importer.id, entry.cardId, entry.count);
        }

        const controller = new DeckSharesController();
        const { ctx } = createContext(importer, {
            body: { shareCode: share.code },
        });
        const result = (await controller.import(ctx)) as ImportDeckResponse;

        assert.equal(result.deck.cardCount, expectedImportedCount);
        assert.isFalse(result.deck.valid);
        assert.deepInclude(result.missingCards, {
            cardId: skippedEntry.cardId,
            count: skippedEntry.count,
        });
    });

    test("DeckSharesController.import rejects users with no cards from the shared deck", async ({
        assert,
    }) => {
        await syncCards();

        const owner = await createUser("owner-missing");
        const importer = await createUser("importer-missing");

        const deck = await createDeckFromRecipe({
            userId: owner.id,
            name: "Deck aggro",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });
        const share = await createDeckShare({ userId: owner.id, deckId: deck.id });

        const controller = new DeckSharesController();
        const { ctx, getBadRequestBody } = createContext(importer, {
            body: { shareCode: share.code },
        });

        await controller.import(ctx);

        assert.deepInclude(getBadRequestBody(), {
            error: "Vous ne possédez aucune carte de ce deck",
        });
    });

    test("DeckSharesController.import rejects invalid shared decks", async ({ assert }) => {
        await syncCards();

        const owner = await createUser("invalid-share");
        const importer = await createUser("invalid-importer");
        await grantStarterCollectionForUser(importer.id);

        const deck = await Deck.create({
            name: "Deck incomplet",
            userId: owner.id,
            selected: true,
        });
        await syncDeckCards(deck.id, [{ cardId: GALADRIM_AGGRO_DECK_RECIPE[0]!.cardId, count: 2 }]);

        const share = await DeckShare.create({
            code: "testcode",
            userId: owner.id,
            deckId: deck.id,
            name: deck.name,
            cards: [{ cardId: GALADRIM_AGGRO_DECK_RECIPE[0]!.cardId, count: 2 }],
        });

        const controller = new DeckSharesController();
        const { ctx, getBadRequestBody } = createContext(importer, {
            body: { shareCode: share.code },
        });

        await controller.import(ctx);

        assert.deepInclude(getBadRequestBody(), {
            error: "Ce deck partagé n'est pas valide",
        });
    });
});
