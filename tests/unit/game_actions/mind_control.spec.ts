import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import {
    createBoostSnapshot,
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionPowersSnapshot,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardIndex } from "#tests/helpers/game/assertions";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";
import { runPlayCardInMemory } from "#tests/helpers/game/run_play_card_in_memory";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";
import { assertError } from "#tests/helpers/game/socket_event_collector";
import { MAX_BOARD_MINIONS } from "#api_types/board";
import { cardHasPlayableTarget } from "#api_types/target_matching";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const countBoardMinions = (board: ReturnType<typeof createEmptyBoard>) => board.length;

test.group("MIND_CONTROL action", () => {
    test("targeted spell steals enemy minion to controller board", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", attack: 4, health: 5 });
        const spell = createSpellCard({
            cost: 8,
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: { mana: 10, hand: [spell] },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(enemyMinion)),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board.length, 0);
        assert.equal(countBoardMinions(game.data.playerOne.board), 1);
        assertBoardIndex(assert, game, "playerOne", 0, {
            attack: 4,
            health: 5,
        });
    });

    test("rejects targeted mind control spell when controller board is full", async ({
        assert,
    }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion" });
        const spell = createSpellCard({
            uuid: "mind-control-spell",
            cost: 8,
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });
        const { errors: _errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: (() => {
                        let board = createEmptyBoard();
                        for (let boardIndex = 0; boardIndex < MAX_BOARD_MINIONS; boardIndex++) {
                            board = placeMinion(
                                board,
                                boardIndex,
                                createMinionState(createMinionCard({ uuid: `ally-${boardIndex}` })),
                            );
                        }
                        return board;
                    })(),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(enemyMinion)),
                },
            }),
            "playerOne",
            {
                cardId: spell.uuid,
                boardIndex: null,
                owner: "PLAYER",
                actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" },
            },
        );

        assertError(assert, "Aucune cible valide pour cette carte");
    });

    test("cardHasPlayableTarget is false for targeted mind control with full board", ({
        assert,
    }) => {
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });
        const enemyMinion = createMinionState(createMinionCard({ uuid: "enemy" }));
        const allyMinion = createMinionState(createMinionCard({ uuid: "ally" }));

        let playerBoard = placeMinion(createEmptyBoard(), 0, allyMinion);
        playerBoard = placeMinion(
            playerBoard,
            1,
            createMinionState(createMinionCard({ uuid: "ally-2" })),
        );
        playerBoard = placeMinion(
            playerBoard,
            2,
            createMinionState(createMinionCard({ uuid: "ally-3" })),
        );
        playerBoard = placeMinion(
            playerBoard,
            3,
            createMinionState(createMinionCard({ uuid: "ally-4" })),
        );
        playerBoard = placeMinion(
            playerBoard,
            4,
            createMinionState(createMinionCard({ uuid: "ally-5" })),
        );

        const opponentBoard = placeMinion(createEmptyBoard(), 0, enemyMinion);

        assert.isFalse(cardHasPlayableTarget(spell, playerBoard, opponentBoard, false));
    });

    test("conditional random battlecry steals when opponent has 4+ minions", ({ assert }) => {
        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 4 },
                }),
            ],
        });

        let opponentBoard = createEmptyBoard();
        for (let boardIndex = 0; boardIndex < 4; boardIndex++) {
            opponentBoard = placeMinion(
                opponentBoard,
                boardIndex,
                createMinionState(createMinionCard({ uuid: `enemy-${boardIndex}` })),
            );
        }

        const { game } = runBattlecry(
            createGameData({
                playerTwo: { board: opponentBoard },
            }),
            hunter,
            { boardIndex: 0 },
        );

        assert.equal(countBoardMinions(game.data.playerOne.board), 2);
        assert.equal(countBoardMinions(game.data.playerTwo.board), 3);
    });

    test("conditional random battlecry fizzles when opponent has fewer than 4 minions", ({
        assert,
    }) => {
        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 4 },
                }),
            ],
        });

        const opponentBoard = placeMinion(
            createEmptyBoard(),
            0,
            createMinionState(createMinionCard({ uuid: "enemy-1" })),
        );

        const { game } = runBattlecry(
            createGameData({
                playerTwo: { board: opponentBoard },
            }),
            hunter,
            { boardIndex: 0 },
        );

        assert.equal(countBoardMinions(game.data.playerOne.board), 1);
        assert.equal(countBoardMinions(game.data.playerTwo.board), 1);
    });

    test("conditional random battlecry fizzles when controller board is full after play", ({
        assert,
    }) => {
        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 4 },
                }),
            ],
        });

        let playerBoard = createEmptyBoard();
        for (let boardIndex = 0; boardIndex < 6; boardIndex++) {
            playerBoard = placeMinion(
                playerBoard,
                boardIndex,
                createMinionState(createMinionCard({ uuid: `ally-${boardIndex}` })),
            );
        }

        let opponentBoard = createEmptyBoard();
        for (let boardIndex = 0; boardIndex < 4; boardIndex++) {
            opponentBoard = placeMinion(
                opponentBoard,
                boardIndex,
                createMinionState(createMinionCard({ uuid: `enemy-${boardIndex}` })),
            );
        }

        const { game } = runBattlecry(
            createGameData({
                playerOne: { board: playerBoard },
                playerTwo: { board: opponentBoard },
            }),
            hunter,
            { boardIndex: 6 },
        );

        assert.equal(countBoardMinions(game.data.playerOne.board), 7);
        assert.equal(countBoardMinions(game.data.playerTwo.board), 4);
    });

    test("reverts aura buffs when minion changes board", ({ assert }) => {
        const auraSourceCard = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 2, health: 2 }),
                        target: createMinionTargetSnapshot("PLAYER"),
                    },
                }),
            ],
        });
        const stolenCard = createMinionCard({ uuid: "stolen", attack: 2, health: 3 });
        const stolen = createMinionState(stolenCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createEmptyBoard(),
                            0,
                            createMinionState(auraSourceCard, { uuid: "aura-source" }),
                        ),
                        1,
                        stolen,
                    ),
                },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerTwo, 0);

        assertBoardIndex(assert, game, "playerTwo", 1, { attack: 4, health: 5 });

        executeAction(
            createCardActionSnapshot({
                type: "MIND_CONTROL",
                target: createMinionTargetSnapshot("OPPONENT"),
                isTargeted: true,
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
            { minionUuid: "stolen", owner: "OPPONENT" },
        );

        assertBoardIndex(assert, game, "playerOne", 0, { attack: 2, health: 3 });
    });

    test("stealth minion cannot be targeted by mind control spell", ({ assert }) => {
        const stealthCard = createMinionCard({
            uuid: "stealth-minion",
            minionPowers: createMinionPowersSnapshot({ hasStealth: true }),
        });
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });

        assert.isFalse(
            cardHasPlayableTarget(
                spell,
                createEmptyBoard(),
                placeMinion(createEmptyBoard(), 0, createMinionState(stealthCard)),
                true,
            ),
        );
    });

    test("random mind control excludes stealth minions", ({ assert }) => {
        const visibleCard = createMinionCard({ uuid: "visible" });
        const stealthCard = createMinionCard({
            uuid: "stealth",
            minionPowers: createMinionPowersSnapshot({ hasStealth: true }),
        });

        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 1 },
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(stealthCard)),
                        1,
                        createMinionState(visibleCard),
                    ),
                },
            }),
            hunter,
            { boardIndex: 0 },
        );

        assert.isNotNull(game.data.playerOne.board[1]);
        assert.equal(game.data.playerOne.board[1]?.uuid, "visible");
        assert.isNotNull(game.data.playerTwo.board[0]);
    });
});
