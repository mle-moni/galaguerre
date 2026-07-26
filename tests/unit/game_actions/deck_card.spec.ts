import { test } from "@japa/runner";
import { targetedAnyMinion } from "../../../database/seed_data/cards/define_card.js";
import {
    addCardsToDeck,
    removeAddedCardsFromDeck,
    removeCardsFromDeck,
} from "../../../app/galaguerre/deck_card_operations.js";
import { getCardPreviewById } from "#api_types/card_preview";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createGamePlayer,
    createMinionCard,
    createMinionState,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";

const LEGUME_CARD_ID = 121;
const NOUVELLE_RECRUE_CARD_ID = 181;

test.group("deck_card_operations", () => {
    test("addCardsToDeck TOP places last added copy on top", ({ assert }) => {
        const player = createGamePlayer(1, { deckCards: [], hand: [] });

        addCardsToDeck(player, LEGUME_CARD_ID, 2, "TOP");

        assert.equal(player.deckCards.length, 2);
        assert.equal(player.deckCards[0]!.cardId, LEGUME_CARD_ID);
        assert.equal(player.deckCards[1]!.cardId, LEGUME_CARD_ID);
        assert.notEqual(player.deckCards[0]!.uuid, player.deckCards[1]!.uuid);
    });

    test("addCardsToDeck BOTTOM appends copies at the end", ({ assert }) => {
        const existing = createMinionCard({ uuid: "existing", cardId: 1 });
        const player = createGamePlayer(1, { deckCards: [existing], hand: [] });

        addCardsToDeck(player, LEGUME_CARD_ID, 1, "BOTTOM");

        assert.equal(player.deckCards.length, 2);
        assert.equal(player.deckCards[0]!.uuid, "existing");
        assert.equal(player.deckCards[1]!.cardId, LEGUME_CARD_ID);
    });

    test("addCardsToDeck RANDOM increases deck size", ({ assert }) => {
        const player = createGamePlayer(1, { deckCards: [], hand: [] });

        addCardsToDeck(player, LEGUME_CARD_ID, 2, "RANDOM");

        assert.equal(player.deckCards.length, 2);
    });

    test("addCardsToDeck marks golden when target owns golden of that card", ({ assert }) => {
        const template = getCardPreviewById(NOUVELLE_RECRUE_CARD_ID)!;
        assert.isTrue(Boolean(template.goldenVideoUrl));

        const player = createGamePlayer(1, {
            deckCards: [],
            hand: [],
            ownedGoldenCardIds: [NOUVELLE_RECRUE_CARD_ID],
        });

        addCardsToDeck(player, NOUVELLE_RECRUE_CARD_ID, 1, "TOP");

        assert.equal(player.deckCards.length, 1);
        assert.isTrue(player.deckCards[0]!.isGolden);
    });

    test("removeCardsFromDeck TOP removes highest card", ({ assert }) => {
        const top = createMinionCard({ uuid: "top", cardId: LEGUME_CARD_ID });
        const bottom = createMinionCard({ uuid: "bottom", cardId: LEGUME_CARD_ID });
        const other = createMinionCard({ uuid: "other", cardId: 1 });
        const player = createGamePlayer(1, { deckCards: [top, other, bottom], hand: [] });

        removeCardsFromDeck(player, LEGUME_CARD_ID, 1, "TOP");

        assert.equal(player.deckCards.length, 2);
        assert.equal(player.deckCards[0]!.uuid, "other");
        assert.equal(player.deckCards[1]!.uuid, "bottom");
    });

    test("removeCardsFromDeck BOTTOM removes lowest matching card", ({ assert }) => {
        const top = createMinionCard({ uuid: "top", cardId: LEGUME_CARD_ID });
        const bottom = createMinionCard({ uuid: "bottom", cardId: LEGUME_CARD_ID });
        const other = createMinionCard({ uuid: "other", cardId: 1 });
        const player = createGamePlayer(1, { deckCards: [top, other, bottom], hand: [] });

        removeCardsFromDeck(player, LEGUME_CARD_ID, 1, "BOTTOM");

        assert.equal(player.deckCards.length, 2);
        assert.equal(player.deckCards[0]!.uuid, "top");
        assert.equal(player.deckCards[1]!.uuid, "other");
    });

    test("removeCardsFromDeck removes only available copies when partial", ({ assert }) => {
        const onlyCopy = createMinionCard({ uuid: "only", cardId: LEGUME_CARD_ID });
        const player = createGamePlayer(1, { deckCards: [onlyCopy], hand: [] });

        const removed = removeCardsFromDeck(player, LEGUME_CARD_ID, 2, "TOP");

        assert.equal(removed, 1);
        assert.equal(player.deckCards.length, 0);
    });

    test("removeCardsFromDeck with null copyCount removes all matching copies", ({ assert }) => {
        const copyOne = createMinionCard({ uuid: "legume-1", cardId: LEGUME_CARD_ID });
        const copyTwo = createMinionCard({ uuid: "legume-2", cardId: LEGUME_CARD_ID });
        const other = createMinionCard({ uuid: "other", cardId: 1 });
        const player = createGamePlayer(1, {
            deckCards: [copyOne, other, copyTwo],
            hand: [],
        });

        const removed = removeCardsFromDeck(player, LEGUME_CARD_ID, null, null);

        assert.equal(removed, 2);
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "other");
    });

    test("removeAddedCardsFromDeck keeps only starting deck cards", ({ assert }) => {
        const startingOne = createMinionCard({
            uuid: "starting-1",
            cardId: 1,
            isStartingDeckCard: true,
        });
        const startingTwo = createMinionCard({
            uuid: "starting-2",
            cardId: 2,
            isStartingDeckCard: true,
        });
        const addedOne = createMinionCard({
            uuid: "added-1",
            cardId: LEGUME_CARD_ID,
            isStartingDeckCard: false,
        });
        const addedTwo = createMinionCard({
            uuid: "added-2",
            cardId: LEGUME_CARD_ID,
            isStartingDeckCard: false,
        });
        const player = createGamePlayer(1, {
            deckCards: [startingOne, addedOne, startingTwo, addedTwo],
            hand: [],
        });

        const removed = removeAddedCardsFromDeck(player);

        assert.equal(removed, 2);
        assert.equal(player.deckCards.length, 2);
        assert.deepEqual(
            player.deckCards.map((card) => card.uuid),
            ["starting-1", "starting-2"],
        );
    });

    test("removeAddedCardsFromDeck keeps cards without provenance flag", ({ assert }) => {
        const legacy = createMinionCard({ uuid: "legacy", cardId: 1 });
        const added = createMinionCard({
            uuid: "added",
            cardId: LEGUME_CARD_ID,
            isStartingDeckCard: false,
        });
        const player = createGamePlayer(1, { deckCards: [legacy, added], hand: [] });

        const removed = removeAddedCardsFromDeck(player);

        assert.equal(removed, 1);
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "legacy");
    });
});

test.group("deck_card battlecry", () => {
    test("ADD battlecry adds copies to allied deck", ({ assert }) => {
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "ADD",
                    deckPlacement: "TOP",
                    deckTargetTeam: "PLAYER",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 2,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.deckCards.length, 2);
        assert.isTrue(
            game.data.playerOne.deckCards.every((card) => card.cardId === LEGUME_CARD_ID),
        );
        assert.equal(game.data.playerTwo.deckCards.length, 0);
    });

    test("ADD battlecry targets opponent deck", ({ assert }) => {
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "ADD",
                    deckPlacement: "BOTTOM",
                    deckTargetTeam: "OPPONENT",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 1,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [] },
                playerTwo: { deckCards: [] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.deckCards.length, 0);
        assert.equal(game.data.playerTwo.deckCards.length, 1);
        assert.equal(game.data.playerTwo.deckCards[0]!.cardId, LEGUME_CARD_ID);
    });

    test("ADD battlecry with ALL targets both decks", ({ assert }) => {
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "ADD",
                    deckPlacement: "RANDOM",
                    deckTargetTeam: "ALL",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 1,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [] },
                playerTwo: { deckCards: [] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.deckCards.length, 1);
        assert.equal(game.data.playerTwo.deckCards.length, 1);
    });

    test("DELETE battlecry removes copies from deck", ({ assert }) => {
        const deckCopy = createMinionCard({ uuid: "legume-1", cardId: LEGUME_CARD_ID });
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "DELETE",
                    deckPlacement: "TOP",
                    deckTargetTeam: "PLAYER",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 2,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [deckCopy] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.deckCards.length, 0);
    });

    test("DELETE all battlecry removes every matching copy from deck", ({ assert }) => {
        const copyOne = createMinionCard({ uuid: "legume-1", cardId: LEGUME_CARD_ID });
        const copyTwo = createMinionCard({ uuid: "legume-2", cardId: LEGUME_CARD_ID });
        const other = createMinionCard({ uuid: "other", cardId: 1 });
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "DELETE",
                    deckPlacement: null,
                    deckTargetTeam: "PLAYER",
                    cardId: LEGUME_CARD_ID,
                    copyCount: null,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [copyOne, other, copyTwo] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.deckCards.length, 1);
        assert.equal(game.data.playerOne.deckCards[0]!.uuid, "other");
    });

    test("DELETE all battlecry targets opponent deck", ({ assert }) => {
        const copyOne = createMinionCard({ uuid: "legume-1", cardId: LEGUME_CARD_ID });
        const copyTwo = createMinionCard({ uuid: "legume-2", cardId: LEGUME_CARD_ID });
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "DELETE",
                    deckPlacement: null,
                    deckTargetTeam: "OPPONENT",
                    cardId: LEGUME_CARD_ID,
                    copyCount: null,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [] },
                playerTwo: { deckCards: [copyOne, copyTwo] },
            }),
            handCard,
        );

        assert.equal(game.data.playerTwo.deckCards.length, 0);
    });

    test("DELETE_ADDED battlecry removes added cards from both decks", ({ assert }) => {
        const playerStarting = createMinionCard({
            uuid: "p-starting",
            cardId: 1,
            isStartingDeckCard: true,
        });
        const playerAdded = createMinionCard({
            uuid: "p-added",
            cardId: LEGUME_CARD_ID,
            isStartingDeckCard: false,
        });
        const opponentStarting = createMinionCard({
            uuid: "o-starting",
            cardId: 2,
            isStartingDeckCard: true,
        });
        const opponentAdded = createMinionCard({
            uuid: "o-added",
            cardId: LEGUME_CARD_ID,
            isStartingDeckCard: false,
        });
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "DELETE_ADDED",
                    deckPlacement: null,
                    deckTargetTeam: "ALL",
                    cardId: null,
                    copyCount: null,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [playerStarting, playerAdded] },
                playerTwo: { deckCards: [opponentStarting, opponentAdded] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.deckCards.length, 1);
        assert.equal(game.data.playerOne.deckCards[0]!.uuid, "p-starting");
        assert.equal(game.data.playerTwo.deckCards.length, 1);
        assert.equal(game.data.playerTwo.deckCards[0]!.uuid, "o-starting");
    });

    test("DELETE_ADDED battlecry keeps mulliganed starting deck cards", ({ assert }) => {
        const mulliganedStarting = createMinionCard({
            uuid: "mulliganed",
            cardId: 1,
            isStartingDeckCard: true,
        });
        const added = createMinionCard({
            uuid: "added",
            cardId: LEGUME_CARD_ID,
            isStartingDeckCard: false,
        });
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "DELETE_ADDED",
                    deckPlacement: null,
                    deckTargetTeam: "PLAYER",
                    cardId: null,
                    copyCount: null,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [mulliganedStarting, added] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.deckCards.length, 1);
        assert.equal(game.data.playerOne.deckCards[0]!.uuid, "mulliganed");
    });
});

test.group("deck_card spell", () => {
    test("ADD spell effect adds non-collectible card to deck", ({ assert }) => {
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "ADD",
                    deckPlacement: "RANDOM",
                    deckTargetTeam: "PLAYER",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 2,
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: { hand: [spell], deckCards: [] },
            }),
            spell,
        );

        assert.equal(game.data.playerOne.deckCards.length, 2);
        assert.equal(game.data.playerOne.deckCards[0]!.label, "Légume");
    });

    test("targeted ADD spell effect adds copies of selected minion to deck", ({ assert }) => {
        const boardMinion = createMinionCard({
            uuid: "board-minion",
            cardId: LEGUME_CARD_ID,
            label: "Légume",
        });
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    isTargeted: true,
                    target: targetedAnyMinion(),
                    deckCardOperation: "ADD",
                    deckPlacement: "RANDOM",
                    deckTargetTeam: "PLAYER",
                    cardId: null,
                    copyCount: 3,
                }),
            ],
        });

        const data = createGameData({
            playerOne: { hand: [spell], deckCards: [] },
            playerTwo: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(boardMinion)),
            },
        });

        const { game } = runSpellEffect(data, spell, {
            actionTarget: { minionUuid: "board-minion", owner: "OPPONENT" },
        });

        assert.equal(game.data.playerOne.deckCards.length, 3);
        assert.isTrue(
            game.data.playerOne.deckCards.every((card) => card.cardId === LEGUME_CARD_ID),
        );
    });
});

test.group("deck_card validation", () => {
    test("addCardsToDeck ignores unknown cardId at runtime", ({ assert }) => {
        const player = createGamePlayer(1, { deckCards: [], hand: [] });

        const added = addCardsToDeck(player, 999999, 2, "TOP");

        assert.equal(added, 0);
        assert.equal(player.deckCards.length, 0);
    });
});
