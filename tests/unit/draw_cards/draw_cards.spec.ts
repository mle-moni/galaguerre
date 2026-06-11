import { test } from "@japa/runner";
import { drawCards, drawOneCard } from "../../../app/galaguerre/draw_cards.js";
import {
    createCardFilterSnapshot,
    createComparisonSnapshot,
    createGamePlayer,
    createMinionCard,
    createSpellCard,
} from "#tests/helpers/game/fixtures";

test.group("draw_cards", () => {
    test("drawOneCard without filter draws from top of deck", ({ assert }) => {
        const top = createMinionCard({ uuid: "top" });
        const bottom = createMinionCard({ uuid: "bottom" });
        const player = createGamePlayer(1, { deckCards: [top, bottom], hand: [] });

        drawOneCard(player);

        assert.equal(player.hand.length, 1);
        assert.equal(player.hand[0]!.uuid, "top");
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "bottom");
    });

    test("drawOneCard with type filter skips non-matching cards", ({ assert }) => {
        const spell = createSpellCard({ uuid: "spell" });
        const minion = createMinionCard({ uuid: "minion" });
        const player = createGamePlayer(1, { deckCards: [spell, minion], hand: [] });

        drawOneCard(player, createCardFilterSnapshot({ type: "MINION" }));

        assert.equal(player.hand.length, 1);
        assert.equal(player.hand[0]!.uuid, "minion");
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "spell");
    });

    test("drawOneCard with cost filter draws first matching card", ({ assert }) => {
        const expensive = createMinionCard({ uuid: "expensive", cost: 5 });
        const cheap = createMinionCard({ uuid: "cheap", cost: 2 });
        const player = createGamePlayer(1, { deckCards: [expensive, cheap], hand: [] });

        drawOneCard(
            player,
            createCardFilterSnapshot({
                type: "MINION",
                comparison: createComparisonSnapshot({ costComparison: "=", cost: 2 }),
            }),
        );

        assert.equal(player.hand.length, 1);
        assert.equal(player.hand[0]!.uuid, "cheap");
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "expensive");
    });

    test("drawOneCard with tag filter draws matching card", ({ assert }) => {
        const noTag = createMinionCard({ uuid: "no-tag", tags: [] });
        const tagged = createMinionCard({ uuid: "tagged", tags: ["MURLOC"] });
        const player = createGamePlayer(1, { deckCards: [noTag, tagged], hand: [] });

        drawOneCard(player, createCardFilterSnapshot({ type: "MINION", tags: ["MURLOC"] }));

        assert.equal(player.hand.length, 1);
        assert.equal(player.hand[0]!.uuid, "tagged");
    });

    test("drawOneCard applies fatigue when deck is empty", ({ assert }) => {
        const player = createGamePlayer(1, {
            deckCards: [],
            hand: [],
            health: 15,
            maxFatigueDamageTaken: 1,
        });

        drawOneCard(player);

        assert.equal(player.hand.length, 0);
        assert.equal(player.health, 13);
        assert.equal(player.maxFatigueDamageTaken, 2);
    });

    test("drawOneCard with filter and empty deck applies fatigue", ({ assert }) => {
        const player = createGamePlayer(1, {
            deckCards: [],
            hand: [],
            health: 15,
            maxFatigueDamageTaken: 0,
        });

        drawOneCard(player, createCardFilterSnapshot({ type: "MINION" }));

        assert.equal(player.hand.length, 0);
        assert.equal(player.health, 14);
        assert.equal(player.maxFatigueDamageTaken, 1);
    });

    test("drawOneCard with filter and no match draws nothing without fatigue", ({ assert }) => {
        const spell = createSpellCard({ uuid: "spell" });
        const player = createGamePlayer(1, {
            deckCards: [spell],
            hand: [],
            health: 15,
            maxFatigueDamageTaken: 0,
        });

        drawOneCard(player, createCardFilterSnapshot({ type: "MINION" }));

        assert.equal(player.hand.length, 0);
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.health, 15);
        assert.equal(player.maxFatigueDamageTaken, 0);
    });

    test("drawCards with filter only draws available matches", ({ assert }) => {
        const spell = createSpellCard({ uuid: "spell" });
        const minion = createMinionCard({ uuid: "minion" });
        const player = createGamePlayer(1, { deckCards: [spell, minion], hand: [] });

        drawCards(player, 2, createCardFilterSnapshot({ type: "MINION" }));

        assert.equal(player.hand.length, 1);
        assert.equal(player.hand[0]!.uuid, "minion");
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "spell");
    });
});
