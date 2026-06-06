import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import Action from "#models/action";
import Card from "#models/card";
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
    createCardActionSnapshot,
    createComparisonSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
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
                q
                    .preload("minionPower")
                    .preload("battlecryActions", (q) =>
                        q
                            .preload("action", (aq) =>
                                aq.preload("toolToTargets", (tq) =>
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
                q
                    .preload("minionPower")
                    .preload("battlecryActions", (q) =>
                        q
                            .preload("action", (aq) =>
                                aq.preload("toolToTargets", (tq) =>
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
        });
        assert.include(
            generated.description,
            "Cri de guerre : Inflige 3 dégâts à un serviteur adverse (attaque > 2).",
        );
    });
});
