import { test } from "@japa/runner";
import { cardHasPlayableTarget } from "#api_types/target_matching";
import {
    dynamicCostPerBoardMinion,
    dynamicCostPerHandCard,
} from "#database/seed_data/cards/define_card";
import { MAX_HAND_SIZE } from "#galaguerre/game_rules";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";
import { runPlayCardInMemory } from "#tests/helpers/game/run_play_card_in_memory";

const createReturnToHandSpell = (costReduction = 2) =>
    createSpellCard({
        uuid: "git-revert",
        cost: 0,
        label: "Git Revert",
        spellActions: [
            createCardActionSnapshot({
                type: "RETURN_TO_HAND",
                isTargeted: true,
                costReduction,
                target: createMinionTargetSnapshot("PLAYER"),
            }),
        ],
    });

const createFullHand = (count = MAX_HAND_SIZE) =>
    Array.from({ length: count }, (_, index) =>
        createMinionCard({ uuid: `hand-card-${index}`, label: `Hand ${index}`, cost: 1 }),
    );

test.group("RETURN_TO_HAND action", () => {
    test("returns ally minion to hand with reduced base cost", ({ assert }) => {
        const allyMinion = createMinionCard({
            uuid: "ally-minion",
            label: "Développeur",
            baseCost: 4,
            cost: 4,
            attack: 2,
            health: 3,
        });
        const spell = createReturnToHandSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 0,
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(allyMinion)),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "ally-minion", owner: "PLAYER" } },
        );

        assert.equal(game.data.playerOne.board.length, 0);
        assert.equal(game.data.playerOne.hand.length, 2);

        const returnedCard = game.data.playerOne.hand.find((card) => card.uuid !== spell.uuid);
        assert.exists(returnedCard);
        assert.equal(returnedCard!.cardId, allyMinion.cardId);
        assert.equal(returnedCard!.baseCost, 4);
        assert.equal(returnedCard!.handCostReduction, 2);
        assert.equal(returnedCard!.cost, 2);
        assert.equal(returnedCard!.type, "MINION");
        if (returnedCard!.type === "MINION") {
            assert.equal(returnedCard!.attack, 2);
            assert.equal(returnedCard!.health, 3);
        }
    });

    test("returns printed stats and ignores board buffs", ({ assert }) => {
        const allyMinion = createMinionCard({
            uuid: "buffed-ally",
            attack: 2,
            health: 3,
        });
        const buffedState = createMinionState(allyMinion, {
            attack: 7,
            health: 8,
        });
        const spell = createReturnToHandSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), 0, buffedState),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "buffed-ally", owner: "PLAYER" } },
        );

        const returnedCard = game.data.playerOne.hand.find((card) => card.uuid !== spell.uuid);
        assert.exists(returnedCard);
        if (returnedCard!.type === "MINION") {
            assert.equal(returnedCard!.attack, 2);
            assert.equal(returnedCard!.health, 3);
        }
    });

    test("does not trigger deathrattle", ({ assert }) => {
        const allyMinion = createMinionCard({
            uuid: "deathrattle-ally",
            deathrattleActions: [
                createCardActionSnapshot({ type: "DRAW", drawCount: 1, isTargeted: false }),
            ],
        });
        const spell = createReturnToHandSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(allyMinion)),
                    deckCards: [createMinionCard({ uuid: "deck-card" })],
                },
            }),
            spell,
            { actionTarget: { minionUuid: "deathrattle-ally", owner: "PLAYER" } },
        );

        assert.equal(game.data.playerOne.deckCards.length, 1);
        assert.equal(game.data.playerOne.hand.length, 2);
    });

    test("overdraws when hand is full", ({ assert }) => {
        const allyMinion = createMinionCard({
            uuid: "ally-minion",
            cardId: 999,
            baseCost: 3,
            cost: 3,
        });
        const spell = createReturnToHandSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    hand: [...createFullHand(MAX_HAND_SIZE - 1), spell],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(allyMinion)),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "ally-minion", owner: "PLAYER" } },
        );

        assert.equal(game.data.playerOne.hand.length, MAX_HAND_SIZE);
        assert.isFalse(game.data.playerOne.hand.some((card) => card.cardId === allyMinion.cardId));

        const overdrawEntry = game.data.actionLog.find((entry) => entry.type === "OVERDRAW");
        assert.exists(overdrawEntry);
    });

    test("refreshes dynamic cost after return to hand", ({ assert }) => {
        const allyMinion = createMinionCard({
            uuid: "dynamic-ally",
            baseCost: 10,
            cost: 10,
            dynamicCost: dynamicCostPerHandCard(),
        });
        const filler = createMinionCard({ uuid: "filler" });
        const spell = createReturnToHandSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    hand: [spell, filler],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(allyMinion)),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "dynamic-ally", owner: "PLAYER" } },
        );

        const returnedCard = game.data.playerOne.hand.find(
            (card) => card.uuid !== spell.uuid && card.uuid !== filler.uuid,
        );
        assert.exists(returnedCard);
        assert.equal(returnedCard!.baseCost, 10);
        assert.equal(returnedCard!.handCostReduction, 2);
        assert.equal(returnedCard!.cost, 5);
    });

    test("has no playable target on enemy minions", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion" });
        const spell = createReturnToHandSpell();

        const hasTarget = cardHasPlayableTarget(
            spell,
            createEmptyBoard(),
            placeMinion(createEmptyBoard(), 0, createMinionState(enemyMinion)),
        );

        assert.isFalse(hasTarget);
    });

    test("git revert integration returns ally to caster hand", ({ assert }) => {
        const allyMinion = createMinionCard({
            uuid: "integration-ally",
            label: "Stagiaire",
            baseCost: 3,
            cost: 3,
        });
        const spell = createReturnToHandSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 0,
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(allyMinion)),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "integration-ally", owner: "PLAYER" } },
        );

        assert.equal(game.data.playerOne.board.length, 0);
        const returnedCard = game.data.playerOne.hand.find((card) => card.label === "Stagiaire");
        assert.exists(returnedCard);
        assert.equal(returnedCard!.baseCost, 3);
        assert.equal(returnedCard!.handCostReduction, 2);
        assert.equal(returnedCard!.cost, 1);
    });

    test("sea giant keeps printed cost and stacks git revert with board reduction", ({
        assert,
    }) => {
        const allyMinion = createMinionCard({
            uuid: "sea-giant",
            baseCost: 10,
            cost: 10,
            dynamicCost: dynamicCostPerBoardMinion(),
        });
        const boardFiller = createMinionState(createMinionCard({ uuid: "board-filler-1" }));
        const spell = createReturnToHandSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    hand: [spell],
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(allyMinion)),
                        1,
                        boardFiller,
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            placeMinion(
                                createEmptyBoard(),
                                0,
                                createMinionState(createMinionCard({ uuid: "enemy-1" })),
                            ),
                            1,
                            createMinionState(createMinionCard({ uuid: "enemy-2" })),
                        ),
                        2,
                        createMinionState(createMinionCard({ uuid: "enemy-3" })),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "sea-giant", owner: "PLAYER" } },
        );

        const returnedCard = game.data.playerOne.hand.find((card) => card.uuid !== spell.uuid);
        assert.exists(returnedCard);
        assert.equal(returnedCard!.baseCost, 10);
        assert.equal(returnedCard!.handCostReduction, 2);
        assert.equal(returnedCard!.cost, 4);
    });

    test("second git revert does not stack cost reduction after the minion was played", async ({
        assert,
    }) => {
        const minion = createMinionCard({
            uuid: "five-drop",
            baseCost: 5,
            cost: 5,
            attack: 2,
            health: 2,
        });
        const spell = createReturnToHandSpell();

        const { game: afterFirstPlay, errors: firstPlayErrors } = await runPlayCardInMemory(
            createGameData({
                playerOne: { mana: 10, hand: [minion] },
            }),
            "playerOne",
            { cardId: minion.uuid, boardIndex: 0, owner: "PLAYER" },
        );
        assert.deepEqual(firstPlayErrors, []);
        assert.isUndefined(afterFirstPlay.data.playerOne.board[0]!.originalCard.handCostReduction);

        const { game: afterFirstRevert } = runSpellEffect(
            {
                ...afterFirstPlay.data,
                playerOne: {
                    ...afterFirstPlay.data.playerOne,
                    hand: [spell],
                },
            },
            spell,
            {
                actionTarget: {
                    minionUuid: afterFirstPlay.data.playerOne.board[0]!.uuid,
                    owner: "PLAYER",
                },
            },
        );

        const revertedCard = afterFirstRevert.data.playerOne.hand.find(
            (card) => card.uuid !== spell.uuid,
        );
        assert.exists(revertedCard);
        assert.equal(revertedCard!.cost, 3);
        assert.equal(revertedCard!.handCostReduction, 2);

        const { game: afterSecondPlay, errors: secondPlayErrors } = await runPlayCardInMemory(
            {
                ...afterFirstRevert.data,
                playerOne: {
                    ...afterFirstRevert.data.playerOne,
                    hand: afterFirstRevert.data.playerOne.hand.filter(
                        (card) => card.uuid !== spell.uuid,
                    ),
                    mana: 10,
                },
            },
            "playerOne",
            { cardId: revertedCard!.uuid, boardIndex: 0, owner: "PLAYER" },
        );
        assert.deepEqual(secondPlayErrors, []);
        assert.isUndefined(afterSecondPlay.data.playerOne.board[0]!.originalCard.handCostReduction);

        const { game: afterSecondRevert } = runSpellEffect(
            {
                ...afterSecondPlay.data,
                playerOne: {
                    ...afterSecondPlay.data.playerOne,
                    hand: [spell],
                },
            },
            spell,
            {
                actionTarget: {
                    minionUuid: afterSecondPlay.data.playerOne.board[0]!.uuid,
                    owner: "PLAYER",
                },
            },
        );

        const twiceRevertedCard = afterSecondRevert.data.playerOne.hand.find(
            (card) => card.uuid !== spell.uuid,
        );
        assert.exists(twiceRevertedCard);
        assert.equal(twiceRevertedCard!.cost, 3);
        assert.equal(twiceRevertedCard!.handCostReduction, 2);
    });
});
