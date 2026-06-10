import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
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
import { runBattlecry } from "#tests/helpers/game/run_battlecry";

test.group("battlecries", () => {
    test("DAMAGE battlecry deals damage to opponent hero", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
    });

    test("HEAL battlecry heals active player hero", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, health: 10, hand: [handCard] },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerOne", 14);
    });

    test("HEAL battlecry caps hero health at max PDV", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, health: 12, hand: [handCard] },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerOne", 22);
    });

    test("HEAL battlecry does not overheal hero already at max PDV", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, health: DEFAULT_HERO_HEALTH, hand: [handCard] },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH);
    });

    test("DAMAGE battlecry resolves target team from snapshot", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, health: DEFAULT_HERO_HEALTH, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 3);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("DRAW battlecry draws cards from deck", ({ assert }) => {
        const deckCard1 = createMinionCard({ uuid: "deck-1", label: "Deck Card 1" });
        const deckCard2 = createMinionCard({ uuid: "deck-2", label: "Deck Card 2" });
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "DRAW", drawCount: 2 })],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    deckCards: [deckCard1, deckCard2],
                },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.hand.length, 2);
        assert.equal(game.data.playerOne.deckCards.length, 0);
        const handUuids = game.data.playerOne.hand.map((c) => c.uuid);
        assert.includeMembers(handUuids, ["deck-1", "deck-2"]);
    });

    test("ENEMY_DRAW battlecry draws cards for opponent", ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "enemy-deck-1", label: "Enemy Deck Card" });
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "ENEMY_DRAW", enemyDrawCount: 1 })],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { deckCards: [deckCard], hand: [] },
            }),
            handCard,
        );

        assert.equal(game.data.playerTwo.hand.length, 1);
        assert.equal(game.data.playerTwo.hand[0]!.uuid, "enemy-deck-1");
        assert.equal(game.data.playerTwo.deckCards.length, 0);
    });

    test("DRAW battlecry applies escalating fatigue when deck is empty", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [createCardActionSnapshot({ type: "DRAW", drawCount: 2 })],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    health: DEFAULT_HERO_HEALTH,
                    hand: [handCard],
                    deckCards: [],
                    maxFatigueDamageTaken: 1,
                },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 5);
        assert.equal(game.data.playerOne.maxFatigueDamageTaken, 3);
        assert.equal(game.data.playerOne.hand.length, 0);
    });

    test("DRAW battlecry with filter draws first matching card from deck", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    deckCards: [spellOnTop, matchingMinion, expensiveMinion],
                },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.hand.length, 1);
        assert.equal(game.data.playerOne.hand[0]!.uuid, "deck-minion");
        assert.equal(game.data.playerOne.deckCards.length, 2);
        assert.equal(game.data.playerOne.deckCards[0]!.uuid, "deck-spell");
        assert.equal(game.data.playerOne.deckCards[1]!.uuid, "deck-expensive");
    });

    test("DRAW battlecry with filter and no match draws nothing", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    health: DEFAULT_HERO_HEALTH,
                    hand: [handCard],
                    deckCards: [spell],
                    maxFatigueDamageTaken: 0,
                },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.hand.length, 0);
        assert.equal(game.data.playerOne.deckCards.length, 1);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH);
        assert.equal(game.data.playerOne.maxFatigueDamageTaken, 0);
    });

    test("ENEMY_DRAW battlecry with filter draws matching card for opponent", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { deckCards: [spell, minion], hand: [] },
            }),
            handCard,
        );

        assert.equal(game.data.playerTwo.hand.length, 1);
        assert.equal(game.data.playerTwo.hand[0]!.uuid, "enemy-deck-minion");
        assert.equal(game.data.playerTwo.deckCards.length, 1);
        assert.equal(game.data.playerTwo.deckCards[0]!.uuid, "enemy-deck-spell");
    });

    test("lethal DAMAGE battlecry ends the game", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({ type: "DAMAGE", damage: DEFAULT_HERO_HEALTH }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: 5 },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerTwo", -25);
        assertIsFinished(assert, game, true);
        assertGameState(assert, game, "FINISHED");
    });

    test("targeted DAMAGE deals damage to opponent hero", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
            { actionTarget: { spotId: null, owner: "OPPONENT" } },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 5);
    });

    test("targeted DAMAGE deals damage to opponent minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE kills opponent minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_3", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_3", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_3", null);
    });

    test("targeted HEAL heals ally minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "PLAYER" } },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted HEAL caps minion health at original card max", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "PLAYER" } },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted HEAL does not overheal minion already at max PDV", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "PLAYER" } },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted DAMAGE with ALL type can damage hero", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, health: DEFAULT_HERO_HEALTH, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
            { actionTarget: { spotId: null, owner: "PLAYER" } },
        );

        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 1);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("mass HEAL with ALL type heals heroes and minions", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
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
            handCard,
        );

        assertPlayerHealth(assert, game, "playerOne", 13);
        assertPlayerHealth(assert, game, "playerTwo", 15);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 3 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 4 });
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 4 });
    });

    test("targeted DAMAGE with comparison filter hits valid minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 2 });
    });

    test("targeted DAMAGE accepts buffed minion matching current attack comparison", ({
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 2 });
    });

    test("targeted DAMAGE with cost comparison filter hits valid minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE with health comparison filter hits valid minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE with tag filter hits matching minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 2,
            tags: ["MURLOC"],
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
                    target: createMinionTargetSnapshot("OPPONENT", { tag: "MURLOC" }),
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 2 });
    });

    test("targeted BOOST gives +2/+2 to ally minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "PLAYER" } },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { attack: 4, health: 5 });
    });

    test("mass BOOST gives +1/+1 to all ally minions", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
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
            handCard,
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { attack: 2, health: 2 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { attack: 2, health: 3 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_3", { attack: 3, health: 4 });
    });

    test("mass BOOST with excludeSelf skips the battlecry minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
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
            handCard,
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { attack: 1, health: 1 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { attack: 2, health: 3 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_3", { attack: 3, health: 4 });
    });

    test("mass BOOST gives +1/+1 to all minions on both teams", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", enemyMinion),
                },
            }),
            handCard,
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { attack: 2, health: 2 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { attack: 2, health: 3 });
        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { attack: 3, health: 4 });
    });

    test("mass DAMAGE battlecry kills all matching enemy minions", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
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
            handCard,
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", null);
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 3 });
    });

    test("targeted DAMAGE with ALL can damage opponent minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { health: 1 });
    });

    test("targeted DAMAGE with ALL can damage ally minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "PLAYER" } },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 1 });
    });

    test("targeted BOOST grants taunt to ally minion", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createGameData().playerOne.board, "SPOT_2", allyMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_2", owner: "PLAYER" } },
        );

        const boosted = game.data.playerOne.board.SPOT_2;
        const boostedCard = boosted?.originalCard;
        assert.isTrue(boostedCard?.type === "MINION" && boostedCard.hasTaunt);
        if (boostedCard?.type === "MINION") {
            assert.include(boostedCard.effects, "Provocation");
        }
    });

    test("BOOST spellPower increases hero spell power", ({ assert }) => {
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

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard], spellPower: 1 },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.spellPower, 3);
    });

    test("multiple battlecries execute in order", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({ type: "DAMAGE", damage: 2 }),
                createCardActionSnapshot({ type: "HEAL", heal: 3 }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, health: 10, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
        assertPlayerHealth(assert, game, "playerOne", 13);
    });

    test("lethal battlecry stops subsequent actions", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({ type: "DAMAGE", damage: DEFAULT_HERO_HEALTH }),
                createCardActionSnapshot({ type: "HEAL", heal: 10 }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, health: 5, hand: [handCard] },
                playerTwo: { health: 10 },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerTwo", -20);
        assertPlayerHealth(assert, game, "playerOne", 5);
        assertIsFinished(assert, game, true);
    });
});
