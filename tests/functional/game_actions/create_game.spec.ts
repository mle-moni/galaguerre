import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { getDefaultGameData } from "#controllers/games/create_game";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import User from "#models/user";
import { buildHumanPlayer, createOutsiderUser } from "#tests/helpers/game/game_factory";
import { getActiveCardSetId } from "#tests/helpers/card_set";
import Game from "#models/game";
import { runSetupNextTurnOnGame } from "#tests/helpers/game/run_pass_turn";
import { defaultMinionData } from "#database/seed_data/cards/define_card";

test.group("game:create", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    const createDeckForUser = async (userId: number, labelPrefix: string) => {
        const deck = await Deck.create({
            name: `Test deck ${labelPrefix}`,
            userId,
            selected: true,
        });

        for (let index = 0; index < 6; index++) {
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

    test("getDefaultGameData creates MULLIGAN state with 30 health and opening hands 3/4", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `cg-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `cg-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "p1");
        const deckTwo = await createDeckForUser(playerTwo.id, "p2");

        const data = await getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "Player One"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "Player Two"),
        });

        assert.equal(data.state, "MULLIGAN");
        assert.equal(data.currentRound, 0);
        assert.equal(data.playerOne.health, 30);
        assert.equal(data.playerTwo.health, 30);
        assert.equal(data.playerOne.hand.length, 3);
        assert.equal(data.playerTwo.hand.length, 4);
        assert.equal(data.playerOne.deckCards.length, 3);
        assert.equal(data.playerTwo.deckCards.length, 2);
        assert.isFalse(data.mulligan?.playerOneDone);
        assert.isFalse(data.mulligan?.playerTwoDone);
    });

    test("getDefaultGameData generates distinct decks for each player", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `cg2-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `cg2-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "deck-a");
        const deckTwo = await createDeckForUser(playerTwo.id, "deck-b");

        const data = await getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "Player One"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "Player Two"),
        });

        const p1Labels = new Set(data.playerOne.hand.map((card) => card.label));
        const p2Labels = new Set(data.playerTwo.hand.map((card) => card.label));

        for (const label of p1Labels) {
            assert.isTrue(label.startsWith("deck-a-"));
        }
        for (const label of p2Labels) {
            assert.isTrue(label.startsWith("deck-b-"));
        }
    });

    test("setupNextGameTurn after MULLIGAN starts player one turn with round 1 and mana 1", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `cg3-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `cg3-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "start-a");
        const deckTwo = await createDeckForUser(playerTwo.id, "start-b");

        const data = getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "Player One"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "Player Two"),
        });

        data.mulligan = { playerOneDone: true, playerTwoDone: true };

        const game = await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data,
            isFinished: false,
        });

        const result = await runSetupNextTurnOnGame(game);

        assert.equal(result.game.data.state, "PLAYER_ONE_TURN");
        assert.equal(result.game.data.currentRound, 1);
        assert.equal(result.game.data.playerOne.mana, 1);
        assert.equal(result.game.data.playerOne.hand.length, 4);
    });

    test("getApiJson hides opponent hand for each player", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `cg4-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `cg4-p2-${unique}@test.fr`,
            password: "test",
        });

        const deckOne = await createDeckForUser(playerOne.id, "hide-a");
        const deckTwo = await createDeckForUser(playerTwo.id, "hide-b");

        const data = await getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "Player One"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "Player Two"),
        });

        const game = await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data,
            isFinished: false,
        });

        const p1View = game.getApiJson(playerOne.id);
        const p2View = game.getApiJson(playerTwo.id);

        assert.equal(p1View.data.playerOne.hand.length, 3);
        assert.equal(p1View.data.playerTwo.hand.length, 4);
        assert.equal(p1View.data.playerTwo.hand[0]!.label, "dummy card");
        assert.equal(p2View.data.playerOne.hand[0]!.label, "dummy card");
        assert.notEqual(p2View.data.playerTwo.hand[0]!.label, "dummy card");
    });

    test("getApiJson allows non-participant to read game state", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `cg5-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `cg5-p2-${unique}@test.fr`,
            password: "test",
        });
        const outsider = await createOutsiderUser();

        const deckOne = await createDeckForUser(playerOne.id, "sec-a");
        const deckTwo = await createDeckForUser(playerTwo.id, "sec-b");

        const data = await getDefaultGameData({
            playerOne: buildHumanPlayer(playerOne, deckOne, "Player One"),
            playerTwo: buildHumanPlayer(playerTwo, deckTwo, "Player Two"),
        });

        const game = await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data,
            isFinished: false,
        });

        const outsiderView = game.getApiJson(outsider.id);

        assert.equal(outsiderView.id, game.id);
        assert.equal(outsiderView.data.playerOne.hand[0]!.label, "dummy card");
        assert.equal(outsiderView.data.playerTwo.hand[0]!.label, "dummy card");
    });
});
