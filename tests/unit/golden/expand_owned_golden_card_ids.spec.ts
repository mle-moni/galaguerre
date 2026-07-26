import { test } from "@japa/runner";
import { isCardCollectible } from "#api_types/card_preview";
import { expandOwnedGoldenCardIds } from "#galaguerre/golden/expand_owned_golden_card_ids";
import { playerOwnsGoldenCard } from "#galaguerre/golden/resolve_is_golden_for_player";

const HEAD_OF_EMOJIS_CARD_ID = 169;
const EMOJI_SPELL_CARD_IDS = [164, 165, 166, 167, 168];
const ARNAUD_CARD_ID = 142;
const BOITE_CODE_NAMES_CARD_ID = 143;
const CODE_NAMES_WORD_CARD_IDS = [144, 145, 146];
const PAPUCHE_CARD_ID = 156;
const PLUME_CARD_ID = 155;
const BUDDY_CHARISMATIQUE_CARD_ID = 182;
const NOUVELLE_RECRUE_CARD_ID = 181;
const DOOM_SCROLLING_CARD_ID = 122;
const LEGUME_CARD_ID = 121;

test.group("expandOwnedGoldenCardIds", () => {
    test("returns empty list when nothing is owned golden", ({ assert }) => {
        assert.deepEqual(expandOwnedGoldenCardIds([]), []);
    });

    test("includes emoji spells linked via Head of Emojis discover labelTags", ({ assert }) => {
        const expanded = expandOwnedGoldenCardIds([HEAD_OF_EMOJIS_CARD_ID]);

        assert.includeMembers(expanded, [HEAD_OF_EMOJIS_CARD_ID, ...EMOJI_SPELL_CARD_IDS]);
        for (const emojiId of EMOJI_SPELL_CARD_IDS) {
            assert.isFalse(isCardCollectible(emojiId));
        }
    });

    test("transitively includes Code Names tokens from Arnaud", ({ assert }) => {
        const expanded = expandOwnedGoldenCardIds([ARNAUD_CARD_ID]);

        assert.includeMembers(expanded, [
            ARNAUD_CARD_ID,
            BOITE_CODE_NAMES_CARD_ID,
            ...CODE_NAMES_WORD_CARD_IDS,
        ]);
    });

    test("includes Papuche token Plume", ({ assert }) => {
        const expanded = expandOwnedGoldenCardIds([PAPUCHE_CARD_ID]);

        assert.includeMembers(expanded, [PAPUCHE_CARD_ID, PLUME_CARD_ID]);
        assert.isFalse(isCardCollectible(PLUME_CARD_ID));
    });

    test("includes Légume from Doom scrolling reconversion", ({ assert }) => {
        const expanded = expandOwnedGoldenCardIds([DOOM_SCROLLING_CARD_ID]);

        assert.includeMembers(expanded, [DOOM_SCROLLING_CARD_ID, LEGUME_CARD_ID]);
        assert.isFalse(isCardCollectible(LEGUME_CARD_ID));
    });

    test("does not grant collectible summons such as Nouvelle Recrue from Buddy", ({ assert }) => {
        const expanded = expandOwnedGoldenCardIds([BUDDY_CHARISMATIQUE_CARD_ID]);

        assert.include(expanded, BUDDY_CHARISMATIQUE_CARD_ID);
        assert.notInclude(expanded, NOUVELLE_RECRUE_CARD_ID);
        assert.isTrue(isCardCollectible(NOUVELLE_RECRUE_CARD_ID));
    });

    test("grants golden entitlement for linked tokens when goldenVideoUrl exists", ({ assert }) => {
        const expanded = expandOwnedGoldenCardIds([HEAD_OF_EMOJIS_CARD_ID]);
        const emojiId = EMOJI_SPELL_CARD_IDS[0]!;

        assert.isTrue(playerOwnsGoldenCard(emojiId, "/card-videos/fake-emoji.mp4", expanded));
        assert.isFalse(playerOwnsGoldenCard(emojiId, null, expanded));
        assert.isFalse(
            playerOwnsGoldenCard(emojiId, "/card-videos/fake-emoji.mp4", [HEAD_OF_EMOJIS_CARD_ID]),
        );
    });
});
