import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import {
    CARD_IDS,
    createAllTargetSnapshot,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";

test.group("game:play_spell", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("applies spellPower bonus to spell damage", async ({ assert }) => {
        const spell = createSpellCard({ cost: 2 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    spellPower: 2,
                    hand: [spell],
                },
                playerTwo: {
                    health: DEFAULT_HERO_HEALTH,
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 5);
    });

    test("plays targeted spell on enemy minion", async ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 4 });
        const spell = createSpellCard({
            cost: 3,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: true,
                damage: 4,
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_1", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.isNull(result.game.data.playerTwo.board.SPOT_1);
        assert.equal(result.game.data.playerOne.hand.length, 0);
    });

    test("draw spell adds card to hand", async ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card" });
        const spell = createSpellCard({
            cost: 1,
            action: createCardActionSnapshot({
                type: "DRAW",
                isTargeted: false,
                drawCount: 1,
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards: [deckCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.hand.length, 1);
        assert.equal(result.game.data.playerOne.hand[0]!.uuid, "deck-card");
        assert.equal(result.game.data.playerOne.deckCards.length, 0);
    });

    test("spell lethal damage ends the game", async ({ assert }) => {
        const spell = createSpellCard({
            cost: 2,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 15,
                target: createHeroTargetSnapshot("OPPONENT"),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    health: 5,
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerTwo.health, -10);
        assert.isTrue(result.game.isFinished);
    });

    test("mass ALL damage spell hits heroes and minions on both teams", async ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 5 });
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 5 });
        const spell = createSpellCard({
            cost: 3,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 2,
                target: createAllTargetSnapshot("ALL"),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(allyMinion),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.health, DEFAULT_HERO_HEALTH - 2);
        assert.equal(result.game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 2);
        assert.equal(result.game.data.playerOne.board.SPOT_1!.health, 3);
        assert.equal(result.game.data.playerTwo.board.SPOT_1!.health, 3);
    });

    test("mass ALL damage spell with OPPONENT team only hits opponent characters", async ({
        assert,
    }) => {
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 5 });
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 5 });
        const spell = createSpellCard({
            cost: 3,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 2,
                target: createAllTargetSnapshot("OPPONENT"),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(allyMinion),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.health, DEFAULT_HERO_HEALTH);
        assert.equal(result.game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 2);
        assert.equal(result.game.data.playerOne.board.SPOT_1!.health, 5);
        assert.equal(result.game.data.playerTwo.board.SPOT_1!.health, 3);
    });

    test("random damage spell hits one enemy minion", async ({ assert }) => {
        const enemyMinion1 = createMinionCard({ uuid: "enemy-minion-1", health: 5 });
        const enemyMinion2 = createMinionCard({ uuid: "enemy-minion-2", health: 5 });
        const spell = createSpellCard({
            cost: 2,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 1,
                target: createMinionTargetSnapshot("OPPONENT", {
                    maxTargets: 1,
                    targetSelectionMode: "RANDOM",
                }),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerTwo.board,
                            "SPOT_1",
                            createMinionState(enemyMinion1),
                        ),
                        "SPOT_2",
                        createMinionState(enemyMinion2),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        const board = result.game.data.playerTwo.board;
        const damagedCount = ["SPOT_1", "SPOT_2", "SPOT_3", "SPOT_4", "SPOT_5"].filter(
            (spotId) => board[spotId as keyof typeof board]?.health === 4,
        ).length;
        assert.equal(damagedCount, 1);
        assert.equal(result.game.data.playerOne.mana, 8);
    });

    test("random damage spell fizzles when no eligible minion exists", async ({ assert }) => {
        const spell = createSpellCard({
            cost: 2,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 1,
                target: createMinionTargetSnapshot("OPPONENT", {
                    maxTargets: 1,
                    targetSelectionMode: "RANDOM",
                }),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.mana, 8);
        assert.equal(result.game.data.playerTwo.health, DEFAULT_HERO_HEALTH);
        assert.equal(result.game.data.playerOne.hand.length, 0);
    });
});
