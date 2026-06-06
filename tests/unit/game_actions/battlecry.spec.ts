import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import Action from "#models/action";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Minion from "#models/minion";
import MinionBattlecryAction from "#models/minion_battlecry_action";
import User from "#models/user";
import { generatePlayerCards } from "#controllers/games/generate_player_cards";
import {
    assertGameState,
    assertIsFinished,
    assertPlayerHealth,
} from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createMinionCard,
} from "#tests/helpers/game/fixtures";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";

test.group("game:play_card battlecries", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("minion without battlecry behaves as before", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 3,
            attack: 2,
            health: 3,
        });

        const result = await runPlayCard({
            data: createGameData({
                currentRound: 4,
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.mana, 2);
        assert.equal(result.game.data.playerOne.hand.length, 0);
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
    });

    test("DAMAGE battlecry deals damage to opponent hero", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "DAMAGE", damage: 3 })],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", 12);
    });

    test("HEAL battlecry heals active player hero", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "HEAL", heal: 4 })],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 10, hand: [handCard] },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerOne", 14);
    });

    test("DRAW battlecry draws cards from deck", async ({ assert }) => {
        const deckCard1 = createMinionCard({ uuid: "deck-1", label: "Deck Card 1" });
        const deckCard2 = createMinionCard({ uuid: "deck-2", label: "Deck Card 2" });
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "DRAW", drawCount: 2 })],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    deckCards: [deckCard1, deckCard2],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.hand.length, 2);
        assert.equal(result.game.data.playerOne.deckCards.length, 0);
        const handUuids = result.game.data.playerOne.hand.map((c) => c.uuid);
        assert.includeMembers(handUuids, ["deck-1", "deck-2"]);
    });

    test("ENEMY_DRAW battlecry draws cards for opponent", async ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "enemy-deck-1", label: "Enemy Deck Card" });
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "ENEMY_DRAW", enemyDrawCount: 1 })],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { deckCards: [deckCard], hand: [] },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerTwo.hand.length, 1);
        assert.equal(result.game.data.playerTwo.hand[0]!.uuid, "enemy-deck-1");
        assert.equal(result.game.data.playerTwo.deckCards.length, 0);
    });

    test("DRAW battlecry applies escalating fatigue when deck is empty", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "DRAW", drawCount: 2 })],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    health: 15,
                    hand: [handCard],
                    deckCards: [],
                    maxFatigueDamageTaken: 1,
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerOne", 10);
        assert.equal(result.game.data.playerOne.maxFatigueDamageTaken, 3);
        assert.equal(result.game.data.playerOne.hand.length, 0);
    });

    test("lethal DAMAGE battlecry ends the game", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "DAMAGE", damage: 15 })],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: 5 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", -10);
        assertIsFinished(assert, result.game, true);
        assertGameState(assert, result.game, "FINISHED");
    });

    test("targeted action is ignored without error", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({ type: "DAMAGE", damage: 5, isTargeted: true }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
    });

    test("BOOST action is ignored without error", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "BOOST" })],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
    });

    test("multiple battlecries execute in order", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({ type: "DAMAGE", damage: 2 }),
                createCardActionSnapshot({ type: "HEAL", heal: 3 }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 10, hand: [handCard] },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", 13);
        assertPlayerHealth(assert, result.game, "playerOne", 13);
    });

    test("lethal battlecry stops subsequent actions", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({ type: "DAMAGE", damage: 15 }),
                createCardActionSnapshot({ type: "HEAL", heal: 10 }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 5, hand: [handCard] },
                playerTwo: { health: 10 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", -5);
        assertPlayerHealth(assert, result.game, "playerOne", 5);
        assertIsFinished(assert, result.game, true);
    });

    test("generatePlayerCards embeds battlecry actions from database", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `bc-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Battlecry deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const minion = await Minion.create({
            internalLabel: `bc-minion-${unique}`,
            attack: 1,
            health: 1,
        });

        const damageAction = await Action.create({
            internalLabel: `bc-damage-${unique}`,
            type: "DAMAGE",
            isTargeted: false,
            damage: 4,
            heal: null,
            drawCount: null,
            enemyDrawCount: null,
            boostId: null,
            drawCardFilterId: null,
            enemyDrawCardFilterId: null,
        });

        await MinionBattlecryAction.create({
            minionId: minion.id,
            actionId: damageAction.id,
        });

        const card = await Card.create({
            label: `bc-card-${unique}`,
            imageUrl: "https://example.com/card.png",
            cost: 1,
            type: "MINION",
            cardMode: "BETA",
            minionId: minion.id,
            spellId: null,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });

        await deck.load("cards", (query) =>
            query.preload("minion", (q) =>
                q
                    .preload("minionPower")
                    .preload("battlecryActions", (q) => q.preload("action").orderBy("id", "asc")),
            ),
        );

        const playerCards = generatePlayerCards(deck);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.type, "DAMAGE");
        assert.equal(generated.battlecryActions[0]!.damage, 4);
        assert.equal(generated.battlecryActions[0]!.isTargeted, false);
    });
});
