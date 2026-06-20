import { test } from "@japa/runner";
import {
    countBoardMinionsOnBoard,
    createEmptyBoard,
    getAdjacentMinions,
    getOccupiedBoardEntries,
    insertMinionAtIndex,
    MAX_BOARD_MINIONS,
    migrateBoardIfNeeded,
    removeMinionByUuid,
} from "#api_types/board";
import { killMinion } from "#galaguerre/action_engine/kill_minion";
import { createGameData, createMinionCard, createMinionState } from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

test.group("board helpers", () => {
    test("inserts minion at index and shifts existing minions", ({ assert }) => {
        const board = createEmptyBoard();
        const first = createMinionState(createMinionCard({ uuid: "first" }));
        const second = createMinionState(createMinionCard({ uuid: "second" }));
        board.push(first, second);

        const inserted = createMinionState(createMinionCard({ uuid: "inserted" }));
        const { inserted: ok } = insertMinionAtIndex(board, 1, inserted);

        assert.isTrue(ok);
        assert.deepEqual(
            board.map((minion) => minion.uuid),
            ["first", "inserted", "second"],
        );
    });

    test("removes minion by uuid", ({ assert }) => {
        const board = createEmptyBoard();
        const left = createMinionState(createMinionCard({ uuid: "left" }));
        const right = createMinionState(createMinionCard({ uuid: "right" }));
        board.push(left, right);

        removeMinionByUuid(board, "left");

        assert.deepEqual(
            getOccupiedBoardEntries(board).map((entry) => entry.minion.uuid),
            ["right"],
        );
    });

    test("returns adjacent minions in order", ({ assert }) => {
        const board = createEmptyBoard();
        board.push(
            createMinionState(createMinionCard({ uuid: "a" })),
            createMinionState(createMinionCard({ uuid: "b" })),
            createMinionState(createMinionCard({ uuid: "c" })),
        );

        const adjacent = getAdjacentMinions(board, 1);

        assert.equal(adjacent.left?.uuid, "a");
        assert.equal(adjacent.right?.uuid, "c");
    });

    test("refuses insertion when board is full", ({ assert }) => {
        const board = createEmptyBoard();

        for (let index = 0; index < MAX_BOARD_MINIONS; index++) {
            insertMinionAtIndex(
                board,
                index,
                createMinionState(createMinionCard({ uuid: `minion-${index}` })),
            );
        }

        const { inserted } = insertMinionAtIndex(
            board,
            MAX_BOARD_MINIONS,
            createMinionState(createMinionCard({ uuid: "overflow" })),
        );

        assert.isFalse(inserted);
        assert.equal(countBoardMinionsOnBoard(board), MAX_BOARD_MINIONS);
    });

    test("killMinion removes minion from board", ({ assert }) => {
        const game = createInMemoryGame(createGameData({ isTraining: true }));
        const board = game.data.playerOne.board;
        board.push(
            createMinionState(createMinionCard({ uuid: "left" })),
            createMinionState(createMinionCard({ uuid: "right" })),
        );

        killMinion(game, game.data.playerOne, "left");

        assert.deepEqual(
            board.map((minion) => minion.uuid),
            ["right"],
        );
    });

    test("migrates legacy spot board to array", ({ assert }) => {
        const legacyBoard = {
            SPOT_1: createMinionState(createMinionCard({ uuid: "first" })),
            SPOT_2: null,
            SPOT_3: createMinionState(createMinionCard({ uuid: "second" })),
            SPOT_4: null,
            SPOT_5: null,
            SPOT_6: null,
            SPOT_7: null,
        };

        const { board, changed } = migrateBoardIfNeeded(legacyBoard);

        assert.isTrue(changed);
        assert.deepEqual(
            board.map((minion) => minion.uuid),
            ["first", "second"],
        );
    });
});
