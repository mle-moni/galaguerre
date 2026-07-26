import { test } from "@japa/runner";
import type Card from "#models/card";
import { getDefaultGameData } from "#controllers/games/create_game";
import { expandOwnedGoldenCardIds } from "#galaguerre/golden/expand_owned_golden_card_ids";
import { generateDiscoverOptions } from "#galaguerre/discover/generate_discover_options";
import { defaultMinionData, spellDiscoverFilter } from "#database/seed_data/cards/define_card";

const HEAD_OF_EMOJIS_CARD_ID = 169;
const EMOJI_SPELL_CARD_IDS = [164, 165, 166, 167, 168];
const PAPUCHE_CARD_ID = 156;
const PLUME_CARD_ID = 155;

const fakeDeckCard = (id: number): Card =>
    ({
        id,
        data: {
            ...defaultMinionData(),
            name: `Card ${id}`,
        },
        rarity: "COMMON",
    }) as Card;

test.group("getDefaultGameData golden expansion", () => {
    test("expands ownedGoldenCardIds with linked non-collectible tokens", ({ assert }) => {
        const deckCards = [
            fakeDeckCard(PAPUCHE_CARD_ID),
            ...Array.from({ length: 5 }, (_, index) => fakeDeckCard(1000 + index)),
        ];

        const data = getDefaultGameData({
            playerOne: {
                userId: 1,
                pseudo: "P1",
                avatarCardId: PAPUCHE_CARD_ID,
                cards: deckCards,
            },
            playerTwo: {
                userId: 2,
                pseudo: "P2",
                avatarCardId: PAPUCHE_CARD_ID,
                cards: deckCards,
            },
            playerOneGoldenCounts: new Map([[PAPUCHE_CARD_ID, 1]]),
        });

        assert.includeMembers(data.playerOne.ownedGoldenCardIds, [PAPUCHE_CARD_ID, PLUME_CARD_ID]);
        assert.deepEqual(data.playerTwo.ownedGoldenCardIds, []);
    });
});

test.group("discover golden via expanded ownership", () => {
    test("emoji discover options stay non-golden without goldenVideoUrl even when parent grants entitlement", ({
        assert,
    }) => {
        const ownedGoldenCardIds = expandOwnedGoldenCardIds([HEAD_OF_EMOJIS_CARD_ID]);
        assert.includeMembers(ownedGoldenCardIds, EMOJI_SPELL_CARD_IDS);

        const options = generateDiscoverOptions(
            spellDiscoverFilter({ labelTags: ["EMOJI"] }),
            5,
            [],
            ownedGoldenCardIds,
        );

        assert.equal(options.length, 5);
        assert.isTrue(options.every((card) => EMOJI_SPELL_CARD_IDS.includes(card.cardId)));
        assert.isTrue(options.every((card) => card.isGolden === false));
        assert.isTrue(options.every((card) => !card.goldenVideoUrl));
    });
});
