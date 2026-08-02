import { test } from "@japa/runner";
import type Card from "#models/card";
import type Deck from "#models/deck";
import { getDefaultGameData } from "#controllers/games/create_game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
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

const goldenCapableDeckCard = (id: number): Card =>
    ({
        ...fakeDeckCard(id),
        data: {
            ...defaultMinionData(),
            name: `Card ${id}`,
            goldenVideoUrl: `/videos/card-${id}.mp4`,
        },
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

test.group("expert AI boss golden cards", () => {
    test("expert AI plays every card golden while the human keeps its own collection", ({
        assert,
    }) => {
        const aiCards = [
            goldenCapableDeckCard(2000),
            goldenCapableDeckCard(2001),
            fakeDeckCard(2002),
            ...Array.from({ length: 3 }, (_, index) => goldenCapableDeckCard(2100 + index)),
        ];
        const humanCards = Array.from({ length: 6 }, (_, index) =>
            goldenCapableDeckCard(3000 + index),
        );

        const data = getDefaultGameData({
            playerOne: {
                userId: 1,
                pseudo: "P1",
                avatarCardId: PAPUCHE_CARD_ID,
                deck: { cards: humanCards } as Deck,
            },
            playerTwo: {
                userId: TRAINING_AI_USER_ID,
                pseudo: "IA",
                avatarCardId: PAPUCHE_CARD_ID,
                cards: aiCards,
            },
            isTraining: true,
            aiDifficulty: "EXPERT",
        });

        const aiCardsInGame = [...data.playerTwo.hand, ...data.playerTwo.deckCards];
        assert.isTrue(
            aiCardsInGame.every((card) => card.isGolden === Boolean(card.goldenVideoUrl)),
        );
        assert.isTrue(aiCardsInGame.some((card) => card.isGolden));
        assert.includeMembers(data.playerTwo.ownedGoldenCardIds, [
            PAPUCHE_CARD_ID,
            PLUME_CARD_ID,
            HEAD_OF_EMOJIS_CARD_ID,
        ]);

        const humanCardsInGame = [...data.playerOne.hand, ...data.playerOne.deckCards];
        assert.isTrue(humanCardsInGame.every((card) => card.isGolden === false));
        assert.deepEqual(data.playerOne.ownedGoldenCardIds, []);
    });

    test("advanced AI keeps normal cards", ({ assert }) => {
        const aiCards = Array.from({ length: 6 }, (_, index) =>
            goldenCapableDeckCard(2000 + index),
        );

        const data = getDefaultGameData({
            playerOne: {
                userId: TRAINING_AI_USER_ID,
                pseudo: "IA",
                avatarCardId: PAPUCHE_CARD_ID,
                cards: aiCards,
            },
            playerTwo: {
                userId: 2,
                pseudo: "P2",
                avatarCardId: PAPUCHE_CARD_ID,
                cards: aiCards,
            },
            isTraining: true,
            aiDifficulty: "ADVANCED",
        });

        const aiCardsInGame = [...data.playerOne.hand, ...data.playerOne.deckCards];
        assert.isTrue(aiCardsInGame.every((card) => card.isGolden === false));
        assert.deepEqual(data.playerOne.ownedGoldenCardIds, []);
    });
});

test.group("discover golden via expanded ownership", () => {
    test("emoji discover options are golden when parent grants entitlement and goldenVideoUrl exists", ({
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
        assert.isTrue(options.every((card) => card.isGolden === true));
        assert.isTrue(options.every((card) => Boolean(card.goldenVideoUrl)));
    });
});
