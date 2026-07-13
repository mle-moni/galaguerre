import { COIN_CARD_ID } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { getDefaultGameData } from "#controllers/games/create_game";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { handleMulliganTimerExpired } from "../../../app/galaguerre/timers/game_timers.js";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Game from "#models/game";
import User from "#models/user";
import { getActiveCardSetId } from "#tests/helpers/card_set";
import { buildHumanPlayer } from "#tests/helpers/game/game_factory";
import { runMulligan, runMulliganOnGame } from "#tests/helpers/game/run_mulligan";
import { clearAllGameTimers } from "../../../app/galaguerre/timers/game_timers.js";
import { defaultMinionData } from "#database/seed_data/cards/define_card";

test.group("game:mulligan", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    const createDeckForUser = async (userId: number, labelPrefix: string, cardCount = 6) => {
        const deck = await Deck.create({
            name: `Mulligan deck ${labelPrefix}`,
            userId,
            selected: true,
        });

        for (let index = 0; index < cardCount; index++) {
            const card = await Card.create({
                cardSetId: await getActiveCardSetId(),
                data: parseMinionData({
                    ...defaultMinionData(),
                    name: `${labelPrefix}-card-${index}`,
                }),
            });

            await DeckCard.create({
                deckId: deck.id,
                cardId: card.id,
            });
        }

        await deck.load("cards");

        return deck;
    };

    test("both players confirming mulligan starts the game and gives The Coin to player two", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `mul-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `mul-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "mul-a");
        const deckTwo = await createDeckForUser(playerTwo.id, "mul-b");

        const data = getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "P1"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "P2"),
        });

        const first = await runMulligan({
            data,
            actor: "playerOne",
            cardIds: [],
            expect: { error: null },
        });

        assert.equal(first.game.data.state, "MULLIGAN");
        assert.isTrue(first.game.data.mulligan?.playerOneDone);
        assert.isFalse(first.game.data.mulligan?.playerTwoDone);

        const second = await runMulliganOnGame(first.game, first.game.data.playerTwo.userId, []);

        assert.equal(second.game.data.state, "PLAYER_ONE_TURN");
        assert.equal(second.game.data.currentRound, 1);
        assert.equal(second.game.data.playerOne.hand.length, 4);
        assert.equal(second.game.data.playerTwo.hand.length, 5);
        assert.isTrue(second.game.data.playerTwo.hand.some((card) => card.cardId === COIN_CARD_ID));
    });

    test("mulligan replaces selected cards without immediately redrawing the same card", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `mul2-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `mul2-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "rep-a", 8);
        const deckTwo = await createDeckForUser(playerTwo.id, "rep-b", 8);

        const data = getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "P1"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "P2"),
        });

        const cardToReplace = data.playerOne.hand[0]!;
        const replacementFromDeck = data.playerOne.deckCards[0]!;

        const result = await runMulligan({
            data,
            actor: "playerOne",
            cardIds: [cardToReplace.uuid],
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.hand.length, 3);
        assert.isFalse(
            result.game.data.playerOne.hand.some((card) => card.uuid === cardToReplace.uuid),
        );
        assert.isTrue(
            result.game.data.playerOne.hand.some((card) => card.uuid === replacementFromDeck.uuid),
        );
        assert.isTrue(
            result.game.data.playerOne.deckCards.some((card) => card.uuid === cardToReplace.uuid),
        );
    });

    test("mulligan timer auto-confirms pending players and starts the game", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `mul3-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `mul3-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "timer-a");
        const deckTwo = await createDeckForUser(playerTwo.id, "timer-b");

        const data = getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "P1"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "P2"),
        });

        const game = await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data,
            isFinished: false,
        });

        const expectedEndsAt = Date.now() + 60_000;
        game.data.mulliganEndsAt = expectedEndsAt;
        await game.save();

        await handleMulliganTimerExpired(game.id, expectedEndsAt);
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_ONE_TURN");
        assert.isTrue(game.data.playerTwo.hand.some((card) => card.cardId === COIN_CARD_ID));

        clearAllGameTimers(game.id);
    });

    test("finalizeMulligan after mulligan starts player one turn", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `mul4-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `mul4-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "fin-a");
        const deckTwo = await createDeckForUser(playerTwo.id, "fin-b");

        const data = getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "P1"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "P2"),
        });

        data.mulligan = { playerOneDone: true, playerTwoDone: true };

        const game = await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data,
            isFinished: false,
        });

        await finalizeMulligan(game);
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_ONE_TURN");
        assert.equal(game.data.playerOne.hand.length, 4);

        clearAllGameTimers(game.id);
    });
});
