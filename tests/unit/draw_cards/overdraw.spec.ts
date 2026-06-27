import { test } from "@japa/runner";
import type Game from "#models/game";
import { drawCards, drawOneCard } from "../../../app/galaguerre/draw_cards.js";
import { addCardsToHand } from "../../../app/galaguerre/hand_card_operations.js";
import { MAX_HAND_SIZE } from "../../../app/galaguerre/game_rules.js";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createEmptyBoard,
    createGameData,
    createGamePlayer,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createPassiveSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

const createFullHand = (count = MAX_HAND_SIZE) =>
    Array.from({ length: count }, (_, index) =>
        createMinionCard({ uuid: `hand-card-${index}`, cardId: index + 1 }),
    );

test.group("overdraw", () => {
    test("drawOneCard overdraws when hand is full", ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card" });
        const player = createGamePlayer(1, {
            hand: createFullHand(),
            deckCards: [deckCard],
        });

        drawOneCard(player);

        assert.equal(player.hand.length, MAX_HAND_SIZE);
        assert.equal(player.deckCards.length, 0);
        assert.equal(player.stats.cardsDrawn, 0);
    });

    test("drawOneCard with game records OVERDRAW in action log", ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card", label: "Carte brûlée" });
        const data = createGameData({
            playerOne: {
                hand: createFullHand(),
                deckCards: [deckCard],
            },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        const overdrawEntry = game.data.actionLog.find((entry) => entry.type === "OVERDRAW");
        assert.exists(overdrawEntry);
        assert.equal(overdrawEntry!.card?.uuid, "deck-card");
        assert.equal(overdrawEntry!.card?.label, "Carte brûlée");
    });

    test("drawCards adds one card and overdraws one when hand has room for one", ({ assert }) => {
        const first = createMinionCard({ uuid: "first" });
        const second = createMinionCard({ uuid: "second" });
        const player = createGamePlayer(1, {
            hand: createFullHand(MAX_HAND_SIZE - 1),
            deckCards: [first, second],
        });

        drawCards(player, 2);

        assert.equal(player.hand.length, MAX_HAND_SIZE);
        assert.equal(player.hand.at(-1)!.uuid, "first");
        assert.equal(player.deckCards.length, 0);
        assert.equal(player.stats.cardsDrawn, 1);
    });

    test("empty deck with full hand applies fatigue instead of overdraw", ({ assert }) => {
        const player = createGamePlayer(1, {
            hand: createFullHand(),
            deckCards: [],
            health: 20,
            maxFatigueDamageTaken: 2,
        });

        drawOneCard(player);

        assert.equal(player.hand.length, MAX_HAND_SIZE);
        assert.equal(player.health, 17);
        assert.equal(player.maxFatigueDamageTaken, 3);
        assert.equal(player.stats.cardsDrawn, 0);
    });

    test("drawOneCard with filter overdraws matching card when hand is full", ({ assert }) => {
        const spell = createSpellCard({ uuid: "spell" });
        const minion = createMinionCard({ uuid: "minion" });
        const player = createGamePlayer(1, {
            hand: createFullHand(),
            deckCards: [spell, minion],
        });

        drawOneCard(player, createCardFilterSnapshot({ type: "MINION" }));

        assert.equal(player.hand.length, MAX_HAND_SIZE);
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "spell");
        assert.equal(player.stats.cardsDrawn, 0);
    });

    test("DRAW passive does not trigger on overdraw", ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card" });
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DRAW",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 2,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                deckCards: [deckCard],
                hand: createFullHand(),
            },
            playerTwo: { health: 15 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.health, 15);
    });

    test("addCardsToHand overdraws when hand is full", ({ assert }) => {
        const player = createGamePlayer(1, {
            hand: createFullHand(),
            deckCards: [],
        });

        const added = addCardsToHand(player, 121, 1);

        assert.equal(added, 0);
        assert.equal(player.hand.length, MAX_HAND_SIZE);
    });

    test("addCardsToHand with game records OVERDRAW for generated card", ({ assert }) => {
        const data = createGameData({
            playerOne: {
                hand: createFullHand(),
                deckCards: [],
            },
        });
        const game = createGame(data);

        addCardsToHand(game.data.playerOne, 121, 1, game);

        const overdrawEntry = game.data.actionLog.find((entry) => entry.type === "OVERDRAW");
        assert.exists(overdrawEntry);
        assert.equal(overdrawEntry!.card?.cardId, 121);
        assert.equal(overdrawEntry!.card?.label, "Légume");
    });

    test("successful draw still triggers DRAW passives", ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card" });
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DRAW",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 2,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                deckCards: [deckCard],
                hand: createFullHand(MAX_HAND_SIZE - 1),
            },
            playerTwo: { health: 15 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerOne.hand.length, MAX_HAND_SIZE);
        assert.equal(game.data.playerTwo.health, 13);
    });
});
