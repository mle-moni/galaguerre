import { MAX_BOARD_MINIONS } from "#api_types/board";
import { test } from "@japa/runner";
import type Game from "#models/game";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { getMinionCardTemplateById } from "#galaguerre/card_catalog";
import {
    resetRandomIntInRangeOverride,
    setRandomIntInRangeOverride,
} from "../../../app/utils/random.js";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createPassiveSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertPlayerHealth } from "#tests/helpers/game/assertions";

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

const minionSummonFilter = createCardFilterSnapshot({ type: "MINION" });
const minionHandFilter = createCardFilterSnapshot({ type: "MINION" });

test.group("SUMMON_FROM_HAND action", (group) => {
    group.each.teardown(() => {
        resetRandomIntInRangeOverride();
    });

    test("summons a random minion from opponent hand onto opponent board", ({ assert }) => {
        const firstMinion = createMinionCard({ uuid: "hand-minion-1", attack: 2, health: 3 });
        const secondMinion = createMinionCard({ uuid: "hand-minion-2", attack: 4, health: 1 });

        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard() },
                playerTwo: {
                    board: createEmptyBoard(),
                    hand: [firstMinion, secondMinion],
                },
            }),
        );

        setRandomIntInRangeOverride(() => 1);

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.lengthOf(game.data.playerTwo.hand, 1);
        assert.equal(game.data.playerTwo.hand[0]!.uuid, firstMinion.uuid);
        assert.isNotNull(game.data.playerTwo.board[0]);
        assert.equal(game.data.playerTwo.board[0]!.originalCard.uuid, secondMinion.uuid);
    });

    test("summoned minion does not trigger battlecry", ({ assert }) => {
        const negotiator = getMinionCardTemplateById(79)!;

        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard(), health: 20 },
                playerTwo: {
                    board: createEmptyBoard(),
                    hand: [negotiator],
                },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerOne", 20);
        assert.isNotNull(game.data.playerTwo.board[0]);
        assert.lengthOf(game.data.playerTwo.hand, 0);
    });

    test("only summons minions when hand contains spells and minions", ({ assert }) => {
        const minion = createMinionCard({ uuid: "eligible-minion" });
        const spell = createSpellCard({ uuid: "ineligible-spell" });

        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard() },
                playerTwo: {
                    board: createEmptyBoard(),
                    hand: [spell, minion],
                },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.lengthOf(game.data.playerTwo.hand, 1);
        assert.equal(game.data.playerTwo.hand[0]!.uuid, spell.uuid);
        assert.equal(game.data.playerTwo.board[0]!.originalCard.uuid, minion.uuid);
    });

    test("fails silently when opponent board is full", ({ assert }) => {
        let board = createEmptyBoard();
        for (let boardIndex = 0; boardIndex < MAX_BOARD_MINIONS; boardIndex++) {
            board = placeMinion(
                board,
                boardIndex,
                createMinionState(createMinionCard({ uuid: `filler-${boardIndex}` })),
            );
        }

        const handMinion = createMinionCard({ uuid: "stuck-in-hand" });
        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard() },
                playerTwo: { board, hand: [handMinion] },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.lengthOf(game.data.playerTwo.hand, 1);
        assert.equal(game.data.playerTwo.board.length, MAX_BOARD_MINIONS);
    });

    test("fails silently when opponent hand is empty", ({ assert }) => {
        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard() },
                playerTwo: { board: createEmptyBoard(), hand: [] },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.equal(game.data.playerTwo.board.length, 0);
    });

    test("fails silently when opponent hand has no minions", ({ assert }) => {
        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard() },
                playerTwo: {
                    board: createEmptyBoard(),
                    hand: [createSpellCard({ uuid: "only-spell" })],
                },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.lengthOf(game.data.playerTwo.hand, 1);
        assert.equal(game.data.playerTwo.board.length, 0);
    });

    test("triggers SUMMON passives on controller board", ({ assert }) => {
        const juggler = createMinionCard({
            uuid: "knife-juggler",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "SUMMON",
                    summonFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const handMinion = createMinionCard({ uuid: "forced-summon" });
        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(juggler)),
                },
                playerTwo: {
                    board: createEmptyBoard(),
                    hand: [handMinion],
                    health: 20,
                },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerTwo", 19);
        assert.isNotNull(game.data.playerTwo.board[0]);
    });

    test("does not trigger PLAY_CARD passives", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "play-card-passive",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const handMinion = createMinionCard({ uuid: "forced-summon" });
        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                },
                playerTwo: {
                    board: createEmptyBoard(),
                    hand: [handMinion],
                    health: 20,
                },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON_FROM_HAND",
            summonTargetTeam: "OPPONENT",
            handCardFilter: minionHandFilter,
            summonCount: 1,
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerTwo", 20);
    });
});
