import { test } from "@japa/runner";
import {
    createCardActionSnapshot,
    createComparisonSnapshot,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";
import { getMinionHasDivineShield } from "#galaguerre/action_engine/apply_damage_to_minion";

const jetDeDucrosAction = () =>
    createCardActionSnapshot({
        type: "DAMAGE",
        isTargeted: true,
        damage: 2,
        target: createMinionTargetSnapshot("ALL"),
        onTargetResult: {
            when: "SURVIVED",
            healthComparison: createComparisonSnapshot({
                healthComparison: "=",
                health: 1,
            }),
            action: createCardActionSnapshot({
                type: "DRAW",
                drawCount: 2,
            }),
        },
    });

const mortalCoilAction = () =>
    createCardActionSnapshot({
        type: "DAMAGE",
        isTargeted: true,
        damage: 1,
        target: createMinionTargetSnapshot("ALL"),
        onTargetResult: {
            when: "KILLED",
            healthComparison: null,
            action: createCardActionSnapshot({
                type: "DRAW",
                drawCount: 1,
            }),
        },
    });

test.group("onTargetResult effects", () => {
    test("draws when targeted minion survives with exactly 1 health", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 3 });
        const deckCards = [
            createMinionCard({ uuid: "deck-1" }),
            createMinionCard({ uuid: "deck-2" }),
            createMinionCard({ uuid: "deck-3" }),
        ];
        const spell = createSpellCard({
            cost: 2,
            spellActions: [jetDeDucrosAction()],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards,
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board[0]?.health, 1);
        assert.isTrue(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
        assert.isTrue(game.data.playerOne.hand.some((card) => card.uuid === "deck-2"));
        assert.equal(game.data.playerOne.deckCards.length, 1);
    });

    test("does not draw when targeted minion dies", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 2 });
        const deckCards = [
            createMinionCard({ uuid: "deck-1" }),
            createMinionCard({ uuid: "deck-2" }),
        ];
        const spell = createSpellCard({
            cost: 2,
            spellActions: [jetDeDucrosAction()],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards,
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board.length, 0);
        assert.isFalse(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
        assert.equal(game.data.playerOne.deckCards.length, 2);
    });

    test("does not draw when targeted minion survives above 1 health", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 4 });
        const deckCards = [
            createMinionCard({ uuid: "deck-1" }),
            createMinionCard({ uuid: "deck-2" }),
        ];
        const spell = createSpellCard({
            cost: 2,
            spellActions: [jetDeDucrosAction()],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards,
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board[0]?.health, 2);
        assert.isFalse(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
        assert.equal(game.data.playerOne.deckCards.length, 2);
    });

    test("does not draw when divine shield absorbs damage", ({ assert }) => {
        const enemyMinion = createMinionCard({
            uuid: "enemy-minion",
            health: 3,
            minionPowers: { hasDivineShield: true },
        });
        const deckCards = [
            createMinionCard({ uuid: "deck-1" }),
            createMinionCard({ uuid: "deck-2" }),
        ];
        const spell = createSpellCard({
            cost: 2,
            spellActions: [jetDeDucrosAction()],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards,
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board[0]?.health, 3);
        assert.isFalse(getMinionHasDivineShield(game.data.playerTwo.board[0]!));
        assert.isFalse(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
        assert.equal(game.data.playerOne.deckCards.length, 2);
    });

    test("draws on kill for KILLED trigger", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 1 });
        const deckCards = [createMinionCard({ uuid: "deck-1" })];
        const spell = createSpellCard({
            cost: 1,
            spellActions: [mortalCoilAction()],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards,
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board.length, 0);
        assert.isTrue(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
        assert.equal(game.data.playerOne.deckCards.length, 0);
    });

    test("does not draw on survival for KILLED trigger", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 3 });
        const deckCards = [createMinionCard({ uuid: "deck-1" })];
        const spell = createSpellCard({
            cost: 1,
            spellActions: [mortalCoilAction()],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards,
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board[0]?.health, 2);
        assert.isFalse(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
        assert.equal(game.data.playerOne.deckCards.length, 1);
    });

    test("does not draw when spell power kills the minion", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 3 });
        const deckCards = [
            createMinionCard({ uuid: "deck-1" }),
            createMinionCard({ uuid: "deck-2" }),
        ];
        const spell = createSpellCard({
            cost: 2,
            spellActions: [jetDeDucrosAction()],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    spellPower: 1,
                    hand: [spell],
                    deckCards,
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board.length, 0);
        assert.isFalse(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
        assert.equal(game.data.playerOne.deckCards.length, 2);
    });
});
