import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { syncDeckCards, validateDeckCardEntries } from "#controllers/decks/deck_utils";
import { listCards } from "#controllers/cards/list_cards";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import Card from "#models/card";
import Deck from "#models/deck";
import User from "#models/user";
import { getActiveCardSetId } from "#tests/helpers/card_set";
import { defaultMinionData } from "#database/seed_data/cards/define_card";

test.group("decks api", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    const createUser = async (suffix: string) =>
        User.create({
            email: `decks-${suffix}@test.fr`,
            pseudo: `player-${suffix}`,
            password: "test",
        });

    const createMinionCard = async (label: string, isCollectible = true) => {
        return Card.create({
            cardSetId: await getActiveCardSetId(),
            data: parseMinionData({
                ...defaultMinionData(),
                name: label,
            }),
            isCollectible,
        });
    };

    test("serializeDeck groups duplicate cards and counts them", async ({ assert }) => {
        const user = await createUser("serialize");
        const deck = await Deck.create({
            name: "Test deck",
            userId: user.id,
            selected: true,
        });

        const card = await createMinionCard("Lutin");
        await syncDeckCards(deck.id, [{ cardId: card.id, count: 2 }]);

        await deck.load("cards", (q) => q.preload("cardSet"));

        const serialized = serializeDeck(deck);

        assert.equal(serialized.cardCount, 2);
        assert.deepEqual(serialized.cards, [{ cardId: card.id, count: 2 }]);
        assert.isFalse(serialized.valid);
        assert.isNotEmpty(serialized.compositionErrors);
    });

    test("selecting a deck deselects other decks for the same user", async ({ assert }) => {
        const user = await createUser("select");

        const deckA = await Deck.create({
            name: "Deck A",
            userId: user.id,
            selected: true,
        });
        const deckB = await Deck.create({
            name: "Deck B",
            userId: user.id,
            selected: false,
        });

        await Deck.query().where("userId", user.id).update({ selected: false });
        deckB.selected = true;
        await deckB.save();

        await deckA.refresh();
        await deckB.refresh();

        assert.isFalse(deckA.selected);
        assert.isTrue(deckB.selected);
    });

    test("serializeDeck marks deck invalid when it contains a non-collectible card", async ({
        assert,
    }) => {
        const user = await createUser("non-collectible");
        const deck = await Deck.create({
            name: "Invalid deck",
            userId: user.id,
            selected: false,
        });

        const card = await createMinionCard("Légume", false);
        await syncDeckCards(deck.id, [{ cardId: card.id, count: 1 }]);
        await deck.load("cards", (q) => q.preload("cardSet"));

        const serialized = serializeDeck(deck);

        assert.isFalse(serialized.valid);
        assert.include(serialized.compositionErrors.join(" "), "n'est pas collectionnable");
    });

    test("validateDeckCardEntries rejects non-collectible cards", async ({ assert }) => {
        const card = await createMinionCard("Légume", false);

        const result = await validateDeckCardEntries([{ cardId: card.id, count: 1 }]);

        assert.isFalse(result.valid);
        assert.include(result.errors[0].reason, "n'est pas collectionnable");
    });

    test("listCards excludes non-collectible cards", async ({ assert }) => {
        await createMinionCard("Légume", false);
        const collectible = await createMinionCard("Lutin", true);

        const cards = await listCards({} as never);

        assert.isTrue(cards.some((card) => card.id === collectible.id));
        assert.isFalse(cards.some((card) => card.label === "Légume"));
    });
});
