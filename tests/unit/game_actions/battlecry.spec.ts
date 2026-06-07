import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import CardFilter from "#models/card_filter";
import Comparison from "#models/comparison";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Minion from "#models/minion";
import MinionBattlecryAction from "#models/minion_battlecry_action";
import Target from "#models/target";
import ToolToTarget from "#models/tool_to_target";
import User from "#models/user";
import { generatePlayerCards } from "#controllers/games/generate_player_cards";
import {
    assertBoardSpot,
    assertGameState,
    assertIsFinished,
    assertPlayerHealth,
} from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createAllTargetSnapshot,
    createBoostSnapshot,
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createComparisonSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    MINION_IDS,
    placeMinion,
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
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
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
        assertPlayerHealth(assert, result.game, "playerTwo", 12);
    });

    test("HEAL battlecry heals active player hero", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 4,
                    target: createHeroTargetSnapshot("PLAYER"),
                }),
            ],
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

    test("HEAL battlecry caps hero health at max PDV", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 10,
                    target: createHeroTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 12, hand: [handCard] },
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
        assertPlayerHealth(assert, result.game, "playerOne", 15);
    });

    test("HEAL battlecry does not overheal hero already at max PDV", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 5,
                    target: createHeroTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 15, hand: [handCard] },
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
        assertPlayerHealth(assert, result.game, "playerOne", 15);
    });

    test("DAMAGE battlecry resolves target team from snapshot", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    target: createHeroTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 15, hand: [handCard] },
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
        assertPlayerHealth(assert, result.game, "playerOne", 12);
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
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

    test("DRAW battlecry with filter draws first matching card from deck", async ({ assert }) => {
        const spellOnTop = createSpellCard({ uuid: "deck-spell" });
        const matchingMinion = createMinionCard({ uuid: "deck-minion", cost: 2 });
        const expensiveMinion = createMinionCard({ uuid: "deck-expensive", cost: 6 });
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 1,
                    drawCardFilter: createCardFilterSnapshot({
                        type: "MINION",
                        comparison: createComparisonSnapshot({
                            costComparison: "=",
                            cost: 2,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    deckCards: [spellOnTop, matchingMinion, expensiveMinion],
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
        assert.equal(result.game.data.playerOne.hand.length, 1);
        assert.equal(result.game.data.playerOne.hand[0]!.uuid, "deck-minion");
        assert.equal(result.game.data.playerOne.deckCards.length, 2);
        assert.equal(result.game.data.playerOne.deckCards[0]!.uuid, "deck-spell");
        assert.equal(result.game.data.playerOne.deckCards[1]!.uuid, "deck-expensive");
    });

    test("DRAW battlecry with filter and no match draws nothing", async ({ assert }) => {
        const spell = createSpellCard({ uuid: "deck-spell-only" });
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 1,
                    drawCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    health: 15,
                    hand: [handCard],
                    deckCards: [spell],
                    maxFatigueDamageTaken: 0,
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
        assert.equal(result.game.data.playerOne.hand.length, 0);
        assert.equal(result.game.data.playerOne.deckCards.length, 1);
        assertPlayerHealth(assert, result.game, "playerOne", 15);
        assert.equal(result.game.data.playerOne.maxFatigueDamageTaken, 0);
    });

    test("ENEMY_DRAW battlecry with filter draws matching card for opponent", async ({
        assert,
    }) => {
        const spell = createSpellCard({ uuid: "enemy-deck-spell" });
        const minion = createMinionCard({ uuid: "enemy-deck-minion" });
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "ENEMY_DRAW",
                    enemyDrawCount: 1,
                    enemyDrawCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { deckCards: [spell, minion], hand: [] },
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
        assert.equal(result.game.data.playerTwo.hand[0]!.uuid, "enemy-deck-minion");
        assert.equal(result.game.data.playerTwo.deckCards.length, 1);
        assert.equal(result.game.data.playerTwo.deckCards[0]!.uuid, "enemy-deck-spell");
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

    test("rejects targeted action without actionTarget", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    isTargeted: true,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
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
            expect: { error: "Vous devez choisir une cible pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous devez choisir une cible pour cette carte",
        });
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
    });

    test("targeted DAMAGE deals damage to opponent hero", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    isTargeted: true,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
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
                actionTarget: { spotId: null, owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", 10);
    });

    test("targeted DAMAGE deals damage to opponent minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 2,
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE kills opponent minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 2,
            attack: 1,
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_3", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_3", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_3", null);
    });

    test("targeted HEAL heals ally minion", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 3,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard, { health: 1 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "PLAYER" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted HEAL caps minion health at original card max", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 3,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard, { health: 1 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 5,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "PLAYER" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted HEAL does not overheal minion already at max PDV", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 3,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard, { health: 3 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "PLAYER" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted DAMAGE with ALL type can damage hero", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 1,
                    isTargeted: true,
                    target: createAllTargetSnapshot("ALL"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 15, hand: [handCard] },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: null, owner: "PLAYER" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerOne", 14);
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
    });

    test("mass HEAL with ALL type heals heroes and minions", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 5,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard, { health: 1 });
        const enemyCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 2,
        });
        const enemyMinion = createMinionState(enemyCard, { health: 2 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 3,
            health: 3,
            attack: 3,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 3,
                    isTargeted: false,
                    target: createAllTargetSnapshot("ALL"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    health: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
                playerTwo: {
                    health: 12,
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_1", enemyMinion),
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
        assertPlayerHealth(assert, result.game, "playerOne", 13);
        assertPlayerHealth(assert, result.game, "playerTwo", 15);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { health: 3 });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { health: 4 });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", { health: 4 });
    });

    test("rejects invalid targeted minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 1,
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            attackComparison: ">",
                            attack: 2,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: "Cible invalide pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Cible invalide pour cette carte",
        });
    });

    test("targeted DAMAGE with comparison filter hits valid minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 3,
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            attackComparison: ">",
                            attack: 2,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 2 });
    });

    test("rejects targeted minion when current attack fails comparison despite printed attack", async ({
        assert,
    }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 3,
        });
        const targetMinion = createMinionState(targetCard, { attack: 1 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            attackComparison: ">",
                            attack: 2,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: "Cible invalide pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Cible invalide pour cette carte",
        });
    });

    test("targeted DAMAGE accepts buffed minion matching current attack comparison", async ({
        assert,
    }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 1,
        });
        const targetMinion = createMinionState(targetCard, { attack: 5 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            attackComparison: ">",
                            attack: 2,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 2 });
    });

    test("targeted DAMAGE with cost comparison filter hits valid minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            cost: 4,
            health: 3,
            attack: 2,
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            costComparison: "=",
                            cost: 4,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE with health comparison filter hits valid minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 6,
            attack: 2,
        });
        const targetMinion = createMinionState(targetCard, { health: 2 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 1,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            healthComparison: "<",
                            health: 5,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE with tag filter hits matching minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 2,
            tagIds: [42],
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", { tagId: 42 }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 2 });
    });

    test("targeted BOOST gives +2/+2 to ally minion", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 3,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: true,
                    boost: createBoostSnapshot({ attack: 2, health: 2 }),
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "PLAYER" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { attack: 4, health: 5 });
    });

    test("mass BOOST gives +1/+1 to all ally minions", async ({ assert }) => {
        const allyCard1 = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 2,
            attack: 1,
        });
        const allyCard2 = createMinionCard({
            uuid: MINION_IDS.target,
            health: 3,
            attack: 2,
        });
        const allyMinion1 = createMinionState(allyCard1);
        const allyMinion2 = createMinionState(allyCard2);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    boost: createBoostSnapshot({ attack: 1, health: 1 }),
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(
                        placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion1),
                        "SPOT_3",
                        allyMinion2,
                    ),
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
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { attack: 2, health: 2 });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { attack: 2, health: 3 });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_3", { attack: 3, health: 4 });
    });

    test("mass BOOST with excludeSelf skips the battlecry minion", async ({ assert }) => {
        const allyCard1 = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 2,
            attack: 1,
        });
        const allyCard2 = createMinionCard({
            uuid: MINION_IDS.target,
            health: 3,
            attack: 2,
        });
        const allyMinion1 = createMinionState(allyCard1);
        const allyMinion2 = createMinionState(allyCard2);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            attack: 1,
            health: 1,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    boost: createBoostSnapshot({ attack: 1, health: 1 }),
                    target: createMinionTargetSnapshot("PLAYER", { excludeSelf: true }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(
                        placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion1),
                        "SPOT_3",
                        allyMinion2,
                    ),
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
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { attack: 1, health: 1 });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { attack: 2, health: 3 });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_3", { attack: 3, health: 4 });
    });

    test("mass BOOST gives +1/+1 to all minions on both teams", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 2,
            attack: 1,
        });
        const enemyCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 3,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard);
        const enemyMinion = createMinionState(enemyCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    boost: createBoostSnapshot({ attack: 1, health: 1 }),
                    target: createMinionTargetSnapshot("ALL"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", enemyMinion),
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
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", { attack: 2, health: 2 });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { attack: 2, health: 3 });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { attack: 3, health: 4 });
    });

    test("mass DAMAGE battlecry kills all matching enemy minions", async ({ assert }) => {
        const victimOne = createMinionCard({ uuid: "victim-1", attack: 1, health: 1 });
        const victimTwo = createMinionCard({ uuid: "victim-2", attack: 1, health: 1 });
        const allyMinion = createMinionState(
            createMinionCard({ uuid: MINION_IDS.attacker, attack: 2, health: 3 }),
        );

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 1,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerTwo.board,
                            "SPOT_1",
                            createMinionState(victimOne),
                        ),
                        "SPOT_2",
                        createMinionState(victimTwo),
                    ),
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
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", null);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted DAMAGE with ALL can damage opponent minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 2,
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("ALL"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE with ALL can damage ally minion", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 4,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("ALL"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "PLAYER" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_2", { health: 1 });
    });

    test("targeted BOOST grants taunt to ally minion", async ({ assert }) => {
        const allyCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            health: 3,
            attack: 2,
        });
        const allyMinion = createMinionState(allyCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: true,
                    boost: createBoostSnapshot({
                        minionPower: {
                            hasTaunt: true,
                            hasCharge: false,
                            hasWindfury: false,
                            isPoisonous: false,
                        },
                    }),
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "PLAYER" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        const boosted = result.game.data.playerOne.board.SPOT_2;
        const boostedCard = boosted?.originalCard;
        assert.isTrue(boostedCard?.type === "MINION" && boostedCard.hasTaunt);
        if (boostedCard?.type === "MINION") {
            assert.include(boostedCard.effects, "Provocation");
        }
    });

    test("BOOST spellPower increases hero spell power", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    boost: createBoostSnapshot({ spellPower: 2 }),
                    target: createHeroTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard], spellPower: 1 },
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
        assert.equal(result.game.data.playerOne.spellPower, 3);
    });

    test("rejects targeted BOOST without actionTarget", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: true,
                    boost: createBoostSnapshot({ attack: 2, health: 2 }),
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: "Vous devez choisir une cible pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous devez choisir une cible pour cette carte",
        });
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

        const enemyHeroTarget = await Target.create({
            internalLabel: `bc-enemy-hero-${unique}`,
            type: "HERO",
            targetTeam: "OPPONENT",
            comparisonId: null,
            tagId: null,
        });

        await ToolToTarget.create({
            targetId: enemyHeroTarget.id,
            actionId: damageAction.id,
            boostId: null,
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
                q.preload("minionPower").preload("battlecryActions", (q) =>
                    q
                        .preload("action", (aq) =>
                            aq
                                .preload("boost", (bq) => bq.preload("minionPower"))
                                .preload("drawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("enemyDrawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("toolToTargets", (tq) =>
                                    tq.preload("target", (targetQ) =>
                                        targetQ.preload("comparison"),
                                    ),
                                ),
                        )
                        .orderBy("id", "asc"),
                ),
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
        assert.deepEqual(generated.battlecryActions[0]!.target, {
            type: "HERO",
            targetTeam: "OPPONENT",
            comparison: null,
            tagId: null,
            excludeSelf: false,
            maxTargets: null,
            targetSelectionMode: null,
        });
        assert.include(generated.description, "Cri de guerre : Inflige 4 dégâts au héros adverse.");
    });

    test("generatePlayerCards embeds comparison from database", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `bc-comp-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Battlecry comparison deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const minion = await Minion.create({
            internalLabel: `bc-comp-minion-${unique}`,
            attack: 2,
            health: 2,
        });

        const comparison = await Comparison.create({
            costComparison: null,
            cost: null,
            attackComparison: ">",
            attack: 2,
            healthComparison: null,
            health: null,
        });

        const damageAction = await Action.create({
            internalLabel: `bc-comp-damage-${unique}`,
            type: "DAMAGE",
            isTargeted: true,
            damage: 3,
            heal: null,
            drawCount: null,
            enemyDrawCount: null,
            boostId: null,
            drawCardFilterId: null,
            enemyDrawCardFilterId: null,
        });

        const enemyMinionTarget = await Target.create({
            internalLabel: `bc-comp-enemy-minion-${unique}`,
            type: "MINION",
            targetTeam: "OPPONENT",
            comparisonId: comparison.id,
            tagId: null,
        });

        await ToolToTarget.create({
            targetId: enemyMinionTarget.id,
            actionId: damageAction.id,
            boostId: null,
        });

        await MinionBattlecryAction.create({
            minionId: minion.id,
            actionId: damageAction.id,
        });

        const card = await Card.create({
            label: `bc-comp-card-${unique}`,
            imageUrl: "https://example.com/card.png",
            cost: 3,
            type: "MINION",
            cardMode: "BETA",
            minionId: minion.id,
            spellId: null,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });

        await deck.load("cards", (query) =>
            query.preload("minion", (q) =>
                q.preload("minionPower").preload("battlecryActions", (q) =>
                    q
                        .preload("action", (aq) =>
                            aq
                                .preload("boost", (bq) => bq.preload("minionPower"))
                                .preload("drawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("enemyDrawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("toolToTargets", (tq) =>
                                    tq.preload("target", (targetQ) =>
                                        targetQ.preload("comparison"),
                                    ),
                                ),
                        )
                        .orderBy("id", "asc"),
                ),
            ),
        );

        const playerCards = generatePlayerCards(deck);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.isTargeted, true);
        assert.deepEqual(generated.battlecryActions[0]!.target, {
            type: "MINION",
            targetTeam: "OPPONENT",
            comparison: {
                costComparison: null,
                cost: null,
                attackComparison: ">",
                attack: 2,
                healthComparison: null,
                health: null,
            },
            tagId: null,
            excludeSelf: false,
            maxTargets: null,
            targetSelectionMode: null,
        });
        assert.include(
            generated.description,
            "Cri de guerre : Inflige 3 dégâts à un serviteur adverse (attaque > 2).",
        );
    });

    test("generatePlayerCards embeds boost from database", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `bc-boost-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Battlecry boost deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const minion = await Minion.create({
            internalLabel: `bc-boost-minion-${unique}`,
            attack: 2,
            health: 2,
        });

        const boost = await Boost.create({
            internalLabel: `bc-boost-${unique}`,
            attack: 2,
            health: 2,
            spellPower: null,
            minionPowerId: null,
        });

        const boostAction = await Action.create({
            internalLabel: `bc-boost-action-${unique}`,
            type: "BOOST",
            isTargeted: true,
            damage: null,
            heal: null,
            drawCount: null,
            enemyDrawCount: null,
            boostId: boost.id,
            drawCardFilterId: null,
            enemyDrawCardFilterId: null,
        });

        const allyMinionTarget = await Target.create({
            internalLabel: `bc-boost-target-${unique}`,
            type: "MINION",
            targetTeam: "PLAYER",
            comparisonId: null,
            tagId: null,
        });

        await ToolToTarget.create({
            targetId: allyMinionTarget.id,
            actionId: boostAction.id,
            boostId: null,
        });

        await MinionBattlecryAction.create({
            minionId: minion.id,
            actionId: boostAction.id,
        });

        const card = await Card.create({
            label: `bc-boost-card-${unique}`,
            imageUrl: "https://example.com/card.png",
            cost: 3,
            type: "MINION",
            cardMode: "BETA",
            minionId: minion.id,
            spellId: null,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });

        await deck.load("cards", (query) =>
            query.preload("minion", (q) =>
                q.preload("minionPower").preload("battlecryActions", (q) =>
                    q
                        .preload("action", (aq) =>
                            aq
                                .preload("boost", (bq) => bq.preload("minionPower"))
                                .preload("drawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("enemyDrawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("toolToTargets", (tq) =>
                                    tq.preload("target", (targetQ) =>
                                        targetQ.preload("comparison"),
                                    ),
                                ),
                        )
                        .orderBy("id", "asc"),
                ),
            ),
        );

        const playerCards = generatePlayerCards(deck);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.type, "BOOST");
        assert.deepEqual(generated.battlecryActions[0]!.boost, {
            attack: 2,
            health: 2,
            spellPower: null,
            minionPower: null,
        });
        assert.include(generated.description, "Cri de guerre : Donne +2/+2 à un serviteur allié.");
    });

    test("generatePlayerCards embeds draw card filter from database", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `bc-draw-filter-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Battlecry draw filter deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const minion = await Minion.create({
            internalLabel: `bc-draw-filter-minion-${unique}`,
            attack: 1,
            health: 1,
        });

        const comparison = await Comparison.create({
            costComparison: "=",
            cost: 2,
            attackComparison: null,
            attack: null,
            healthComparison: null,
            health: null,
        });

        const cardFilter = await CardFilter.create({
            internalLabel: `bc-draw-filter-${unique}`,
            type: "MINION",
            comparisonId: comparison.id,
        });

        const drawAction = await Action.create({
            internalLabel: `bc-draw-filter-action-${unique}`,
            type: "DRAW",
            isTargeted: false,
            damage: null,
            heal: null,
            drawCount: 1,
            enemyDrawCount: null,
            boostId: null,
            drawCardFilterId: cardFilter.id,
            enemyDrawCardFilterId: null,
        });

        await MinionBattlecryAction.create({
            minionId: minion.id,
            actionId: drawAction.id,
        });

        const card = await Card.create({
            label: `bc-draw-filter-card-${unique}`,
            imageUrl: "https://example.com/card.png",
            cost: 2,
            type: "MINION",
            cardMode: "BETA",
            minionId: minion.id,
            spellId: null,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });

        await deck.load("cards", (query) =>
            query.preload("minion", (q) =>
                q.preload("minionPower").preload("battlecryActions", (q) =>
                    q
                        .preload("action", (aq) =>
                            aq
                                .preload("boost", (bq) => bq.preload("minionPower"))
                                .preload("drawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("enemyDrawCardFilter", (cfq) =>
                                    cfq.preload("comparison").preload("tags"),
                                )
                                .preload("toolToTargets", (tq) =>
                                    tq.preload("target", (targetQ) =>
                                        targetQ.preload("comparison"),
                                    ),
                                ),
                        )
                        .orderBy("id", "asc"),
                ),
            ),
        );

        const playerCards = generatePlayerCards(deck);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.type, "DRAW");
        assert.equal(generated.battlecryActions[0]!.drawCount, 1);
        assert.deepEqual(generated.battlecryActions[0]!.drawCardFilter, {
            type: "MINION",
            comparison: {
                costComparison: "=",
                cost: 2,
                attackComparison: null,
                attack: null,
                healthComparison: null,
                health: null,
            },
            tagIds: [],
        });
        assert.include(
            generated.description,
            "Cri de guerre : Pioche 1 carte (Monstre, coût = 2).",
        );
    });
});
