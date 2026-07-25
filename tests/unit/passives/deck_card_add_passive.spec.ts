import { test } from "@japa/runner";
import type Game from "#models/game";
import { addCardsToDeckWithPassives } from "../../../app/galaguerre/deck_card_operations.js";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createPassiveSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";

const BUG_CARD_ID = 185;

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

test.group("DECK_CARD_ADD passive", () => {
    test("duplicates each card added to a deck", ({ assert }) => {
        const parrot = createMinionCard({
            uuid: "parrot",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DECK_CARD_ADD",
                    action: createCardActionSnapshot({
                        type: "DECK_CARD",
                        deckCardOperation: "ADD",
                        deckPlacement: null,
                        cardId: null,
                        copyCount: 1,
                        useTriggerContext: true,
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(parrot)),
                deckCards: [],
            },
        });
        const game = createGame(data);

        const { added, gameEnded } = addCardsToDeckWithPassives(
            game,
            game.data.playerOne,
            BUG_CARD_ID,
            1,
            "TOP",
        );

        assert.isFalse(gameEnded);
        assert.equal(added, 1);
        assert.equal(game.data.playerOne.deckCards.length, 2);
        assert.equal(game.data.playerOne.deckCards[0]!.cardId, BUG_CARD_ID);
        assert.equal(game.data.playerOne.deckCards[1]!.cardId, BUG_CARD_ID);
    });

    test("does not recurse infinitely when duplicating", ({ assert }) => {
        const parrot = createMinionCard({
            uuid: "parrot",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DECK_CARD_ADD",
                    action: createCardActionSnapshot({
                        type: "DECK_CARD",
                        deckCardOperation: "ADD",
                        deckPlacement: null,
                        cardId: null,
                        copyCount: 1,
                        useTriggerContext: true,
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(parrot)),
                deckCards: [],
            },
        });
        const game = createGame(data);

        addCardsToDeckWithPassives(game, game.data.playerOne, BUG_CARD_ID, 1, "BOTTOM");

        assert.equal(game.data.playerOne.deckCards.length, 2);
    });
});
