import { test } from "@japa/runner";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import { getCollectibleMinionCardTemplates } from "#api_types/card_preview";
import { generateDiscoverOptions } from "#galaguerre/discover/generate_discover_options";
import type { CardFilterSnapshot } from "#api_types/game.types";

const DEVELOPPEUR_FILTER: CardFilterSnapshot = {
    type: "MINION",
    comparison: null,
    tags: ["DEVELOPPEUR"],
    labelTags: [],
    rarity: null,
};

const SALES_FILTER: CardFilterSnapshot = {
    type: "MINION",
    comparison: null,
    tags: ["SALES"],
    labelTags: [],
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

test.group("generate_discover_options", () => {
    test("returns options from a single filter", ({ assert }) => {
        const options = generateDiscoverOptions(DEVELOPPEUR_FILTER, 3);

        assert.isAtMost(options.length, 3);
        assert.isAbove(options.length, 0);
        assert.isTrue(options.every((card) => deckCardMatchesFilter(card, DEVELOPPEUR_FILTER)));
    });

    test("merges OR filters into one discover pool", ({ assert }) => {
        const options = generateDiscoverOptions(null, 3, [DEVELOPPEUR_FILTER, SALES_FILTER]);

        assert.isAtMost(options.length, 3);
        assert.isAbove(options.length, 0);
        assert.isTrue(options.every((card) => expectedDeveloperOrSalesCardIds.has(card.cardId)));
    });

    test("deduplicates cards that match multiple OR filters", ({ assert }) => {
        const options = generateDiscoverOptions(null, 3, [DEVELOPPEUR_FILTER, SALES_FILTER]);
        const cardIds = options.map((card) => card.cardId);

        assert.equal(new Set(cardIds).size, cardIds.length);
    });

    test("returns no options when OR filters have no matches", ({ assert }) => {
        const impossibleFilter: CardFilterSnapshot = {
            type: "MINION",
            comparison: {
                costComparison: "=",
                cost: 99,
                attackComparison: null,
                attack: null,
                healthComparison: null,
                health: null,
            },
            tags: [],
            labelTags: [],
            rarity: null,
        };

        const options = generateDiscoverOptions(null, 3, [impossibleFilter]);

        assert.equal(options.length, 0);
    });

    test("marks owned golden cards as golden when video exists", ({ assert }) => {
        const goldenTemplates = getCollectibleMinionCardTemplates().filter(
            (card) =>
                deckCardMatchesFilter(card, DEVELOPPEUR_FILTER) && Boolean(card.goldenVideoUrl),
        );
        assert.isAbove(goldenTemplates.length, 0);

        const ownedId = goldenTemplates[0]!.cardId;
        const options = generateDiscoverOptions(DEVELOPPEUR_FILTER, 50, [], [ownedId]);
        const ownedOption = options.find((card) => card.cardId === ownedId);

        assert.isDefined(ownedOption);
        assert.isTrue(ownedOption!.isGolden);
        assert.isTrue(
            options
                .filter((card) => card.cardId !== ownedId)
                .every((card) => card.isGolden === false),
        );
    });

    test("does not mark cards golden without ownership", ({ assert }) => {
        const options = generateDiscoverOptions(DEVELOPPEUR_FILTER, 3);

        assert.isTrue(options.every((card) => card.isGolden === false));
    });
});
