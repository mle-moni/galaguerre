import { test } from "@japa/runner";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import {
    createCardFilterSnapshot,
    createComparisonSnapshot,
    createMinionCard,
    createSpellCard,
} from "#tests/helpers/game/fixtures";

test.group("card_filter_matching", () => {
    test("deckCardMatchesFilter matches card type", ({ assert }) => {
        const minion = createMinionCard();
        const spell = createSpellCard();

        const minionFilter = createCardFilterSnapshot({ type: "MINION" });
        const spellFilter = createCardFilterSnapshot({ type: "SPELL" });

        assert.isTrue(deckCardMatchesFilter(minion, minionFilter));
        assert.isFalse(deckCardMatchesFilter(spell, minionFilter));
        assert.isTrue(deckCardMatchesFilter(spell, spellFilter));
    });

    test("deckCardMatchesFilter applies comparison filters", ({ assert }) => {
        const card = createMinionCard({ cost: 3, attack: 2, health: 4 });
        const filter = createCardFilterSnapshot({
            type: "MINION",
            comparison: createComparisonSnapshot({ costComparison: "=", cost: 3 }),
        });

        assert.isTrue(deckCardMatchesFilter(card, filter));

        const strictFilter = createCardFilterSnapshot({
            type: "MINION",
            comparison: createComparisonSnapshot({ costComparison: ">", cost: 3 }),
        });

        assert.isFalse(deckCardMatchesFilter(card, strictFilter));
    });

    test("deckCardMatchesFilter requires all tags", ({ assert }) => {
        const card = createMinionCard({ tags: ["BEAST", "MURLOC"] });

        assert.isTrue(
            deckCardMatchesFilter(
                card,
                createCardFilterSnapshot({ type: "MINION", tags: ["BEAST"] }),
            ),
        );
        assert.isTrue(
            deckCardMatchesFilter(
                card,
                createCardFilterSnapshot({ type: "MINION", tags: ["BEAST", "MURLOC"] }),
            ),
        );
        assert.isFalse(
            deckCardMatchesFilter(
                card,
                createCardFilterSnapshot({ type: "MINION", tags: ["BEAST", "PIRATE"] }),
            ),
        );
    });
});
