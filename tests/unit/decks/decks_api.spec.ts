import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { syncDeckCards } from "#controllers/decks/deck_utils";
import Card from "#models/card";
import Deck from "#models/deck";
import Minion from "#models/minion";
import User from "#models/user";
import { getActiveCardSetId } from "#tests/helpers/card_set";

test.group("decks api", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    const createUser = async (suffix: string) =>
        User.create({
            email: `decks-${suffix}@test.fr`,
            pseudo: `player-${suffix}`,
            password: "test",
        });

    const createMinionCard = async (label: string) => {
        const minion = await Minion.create({
            internalLabel: label,
            attack: 1,
            health: 1,
        });

        return Card.create({
            label,
            imageUrl: "https://example.com/card.png",
            cost: 1,
            type: "MINION",
            cardSetId: await getActiveCardSetId(),
            minionId: minion.id,
            spellId: null,
            weaponId: null,
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

        await deck.load("cards", (q) =>
            q.preload("cardSet").preload("minion", (mq) => mq.preload("minionPower")),
        );

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
});
