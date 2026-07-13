import { test } from "@japa/runner";
import type { CardFilterSnapshot } from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import { getCollectibleMinionCardTemplates } from "#api_types/card_preview";
import {
    generateCardsToHand,
    generateOneCardToHandWithOrFilters,
} from "#galaguerre/generate_hand_cards";
import { MAX_HAND_SIZE } from "#galaguerre/game_rules";
import { createGamePlayer, createMinionCard } from "#tests/helpers/game/fixtures";

const DEVELOPPEUR_FILTER = {
    type: "MINION" as const,
    comparison: null,
    tags: ["DEVELOPPEUR" as const],
    labelTags: [] as CardFilterSnapshot["labelTags"],
    rarity: null,
};

const SALES_FILTER = {
    type: "MINION" as const,
    comparison: null,
    tags: ["SALES" as const],
    labelTags: [] as CardFilterSnapshot["labelTags"],
    rarity: null,
};

const IMPOSSIBLE_FILTER = {
    type: "MINION" as const,
    comparison: {
        costComparison: "=" as const,
        cost: 99,
        attackComparison: null,
        attack: null,
        healthComparison: null,
        health: null,
    },
    tags: [] as CardFilterSnapshot["tags"],
    labelTags: [] as CardFilterSnapshot["labelTags"],
    rarity: null,
};

const expectedDeveloperOrSalesCardIds = new Set(
    getCollectibleMinionCardTemplates()
        .filter(
            (card) =>
                deckCardMatchesFilter(card, DEVELOPPEUR_FILTER) ||
                deckCardMatchesFilter(card, SALES_FILTER),
        )
        .map((card) => card.cardId),
);

test.group("generate_hand_cards", () => {
    test("generateOneCardToHandWithOrFilters adds a collectible DEVELOPPEUR or SALES minion", ({
        assert,
    }) => {
        const player = createGamePlayer(1, { hand: [], deckCards: [] });

        generateOneCardToHandWithOrFilters(player, [DEVELOPPEUR_FILTER, SALES_FILTER]);

        assert.equal(player.hand.length, 1);
        assert.isTrue(expectedDeveloperOrSalesCardIds.has(player.hand[0]!.cardId));
    });

    test("generateCardsToHand adds multiple generated cards", ({ assert }) => {
        const player = createGamePlayer(1, { hand: [], deckCards: [] });

        generateCardsToHand(player, 2, DEVELOPPEUR_FILTER);

        assert.equal(player.hand.length, 2);
        assert.isTrue(player.hand.every((card) => deckCardMatchesFilter(card, DEVELOPPEUR_FILTER)));
    });

    test("generateOneCardToHandWithOrFilters does nothing when no catalog match exists", ({
        assert,
    }) => {
        const player = createGamePlayer(1, { hand: [], deckCards: [] });

        generateOneCardToHandWithOrFilters(player, [IMPOSSIBLE_FILTER]);

        assert.equal(player.hand.length, 0);
    });

    test("generateCardsToHand overdraws when hand is full", ({ assert }) => {
        const hand = Array.from({ length: MAX_HAND_SIZE }, (_, index) =>
            createMinionCard({ uuid: `hand-${index}` }),
        );
        const player = createGamePlayer(1, { hand, deckCards: [] });

        generateCardsToHand(player, 1, DEVELOPPEUR_FILTER);

        assert.equal(player.hand.length, MAX_HAND_SIZE);
    });
});
