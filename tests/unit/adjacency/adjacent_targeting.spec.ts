import { test } from "@japa/runner";
import {
    collectAdjacentMinionTargets,
    resolveAdjacencyAnchor,
} from "#api_types/adjacent_targeting";
import {
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";

test.group("adjacent targeting", () => {
    test("SOURCE adjacency returns left and right allies", ({ assert }) => {
        const left = createMinionCard({ uuid: "left-ally", attack: 1, health: 2 });
        const source = createMinionCard({ uuid: "source", attack: 0, health: 4 });
        const right = createMinionCard({ uuid: "right-ally", attack: 1, health: 2 });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(left)),
                        1,
                        createMinionState(source),
                    ),
                    2,
                    createMinionState(right),
                ),
            },
        });

        const target = createMinionTargetSnapshot("PLAYER", {
            adjacency: "SOURCE",
            excludeSelf: true,
        });
        const sourceMinion = data.playerOne.board[1]!;
        const context = {
            player: data.playerOne,
            opponent: data.playerTwo,
            sourceMinion,
        };

        const matches = collectAdjacentMinionTargets(target, context, sourceMinion);

        assert.equal(matches.length, 2);
        assert.deepEqual(matches.map((entry) => entry.minion.uuid).sort(), [
            "left-ally",
            "right-ally",
        ]);
    });

    test("SOURCE adjacency excludes source minion", ({ assert }) => {
        const source = createMinionCard({ uuid: "source", attack: 0, health: 4 });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(source)),
            },
        });

        const target = createMinionTargetSnapshot("PLAYER", {
            adjacency: "SOURCE",
            excludeSelf: true,
        });
        const sourceMinion = data.playerOne.board[0]!;
        const context = {
            player: data.playerOne,
            opponent: data.playerTwo,
            sourceMinion,
        };

        assert.equal(collectAdjacentMinionTargets(target, context, sourceMinion).length, 0);
    });

    test("SELECTED_TARGET adjacency returns only enemy neighbors of selected minion", ({
        assert,
    }) => {
        const leftEnemy = createMinionCard({ uuid: "left-enemy", health: 3 });
        const targetEnemy = createMinionCard({ uuid: "target-enemy", health: 5 });
        const rightEnemy = createMinionCard({ uuid: "right-enemy", health: 3 });

        const data = createGameData({
            playerTwo: {
                board: placeMinion(
                    placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(leftEnemy)),
                        1,
                        createMinionState(targetEnemy),
                    ),
                    2,
                    createMinionState(rightEnemy),
                ),
            },
        });

        const target = createMinionTargetSnapshot("OPPONENT", {
            adjacency: "SELECTED_TARGET",
        });
        const context = {
            player: data.playerOne,
            opponent: data.playerTwo,
            selectedTarget: { minionUuid: "target-enemy", owner: "OPPONENT" as const },
        };

        const matches = collectAdjacentMinionTargets(target, context);

        assert.equal(matches.length, 2);
        assert.deepEqual(matches.map((entry) => entry.minion.uuid).sort(), [
            "left-enemy",
            "right-enemy",
        ]);
    });

    test("SELECTED_TARGET adjacency respects targetTeam filter", ({ assert }) => {
        const allyNeighbor = createMinionCard({ uuid: "ally-neighbor", health: 3 });
        const targetEnemy = createMinionCard({ uuid: "target-enemy", health: 5 });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(allyNeighbor)),
            },
            playerTwo: {
                board: placeMinion(createEmptyBoard(), 1, createMinionState(targetEnemy)),
            },
        });

        const target = createMinionTargetSnapshot("OPPONENT", {
            adjacency: "SELECTED_TARGET",
        });
        const context = {
            player: data.playerOne,
            opponent: data.playerTwo,
            selectedTarget: { minionUuid: "target-enemy", owner: "OPPONENT" as const },
        };

        assert.equal(collectAdjacentMinionTargets(target, context).length, 0);
    });

    test("resolveAdjacencyAnchor returns null without anchor context", ({ assert }) => {
        const target = createMinionTargetSnapshot("PLAYER", { adjacency: "SOURCE" });
        const data = createGameData();

        assert.isNull(
            resolveAdjacencyAnchor(target, {
                player: data.playerOne,
                opponent: data.playerTwo,
            }),
        );
    });
});
