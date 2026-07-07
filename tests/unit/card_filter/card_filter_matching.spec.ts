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
        const card = createMinionCard({ tags: ["DEVELOPPEUR", "PM"] });

        assert.isTrue(
            deckCardMatchesFilter(
                card,
                createCardFilterSnapshot({ type: "MINION", tags: ["DEVELOPPEUR"] }),
            ),
        );
        assert.isTrue(
            deckCardMatchesFilter(
                card,
                createCardFilterSnapshot({ type: "MINION", tags: ["DEVELOPPEUR", "PM"] }),
            ),
        );
        assert.isFalse(
            deckCardMatchesFilter(
                card,
                createCardFilterSnapshot({ type: "MINION", tags: ["DEVELOPPEUR", "SALES"] }),
            ),
        );
    });

    test("deckCardMatchesFilter requires all label tags", ({ assert }) => {
        const emojiSpell = createSpellCard({ labelTags: ["EMOJI"] });
        const plainSpell = createSpellCard({ labelTags: [] });

        assert.isTrue(
            deckCardMatchesFilter(
                emojiSpell,
                createCardFilterSnapshot({ type: "SPELL", labelTags: ["EMOJI"] }),
            ),
        );
        assert.isFalse(
            deckCardMatchesFilter(
                plainSpell,
                createCardFilterSnapshot({ type: "SPELL", labelTags: ["EMOJI"] }),
            ),
        );
    });

    test("deckCardMatchesFilter applies rarity filters", ({ assert }) => {
        const common = createMinionCard({ rarity: "COMMON" });
        const legendary = createMinionCard({ rarity: "LEGENDARY" });

        const legendaryFilter = createCardFilterSnapshot({
            type: "MINION",
            rarity: "LEGENDARY",
        });

        assert.isFalse(deckCardMatchesFilter(common, legendaryFilter));
        assert.isTrue(deckCardMatchesFilter(legendary, legendaryFilter));
        assert.isTrue(deckCardMatchesFilter(common, createCardFilterSnapshot({ type: "MINION" })));
    });
});
