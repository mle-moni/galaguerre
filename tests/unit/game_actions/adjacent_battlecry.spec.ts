import { test } from "@japa/runner";
import {
    createBoostSnapshot,
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";

test.group("adjacent battlecry", () => {
    test("boosts adjacent allies with taunt when played between them", ({ assert }) => {
        const leftAlly = createMinionCard({ uuid: "left-ally", attack: 2, health: 2 });
        const rightAlly = createMinionCard({ uuid: "right-ally", attack: 2, health: 2 });
        const argusLike = createMinionCard({
            uuid: "argus-source",
            cost: 4,
            attack: 2,
            health: 3,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: false,
                    boost: createBoostSnapshot({
                        attack: 1,
                        health: 1,
                        minionPowers: {
                            hasTaunt: true,
                            hasCharge: false,
                            hasWindfury: false,
                            isPoisonous: false,
                            hasStealth: false,
                            hasDivineShield: false,
                        },
                    }),
                    target: createMinionTargetSnapshot("PLAYER", {
                        adjacency: "SOURCE",
                        excludeSelf: true,
                    }),
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [argusLike],
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(leftAlly)),
                        1,
                        createMinionState(rightAlly),
                    ),
                },
            }),
            argusLike,
            { boardIndex: 1 },
        );

        const left = game.data.playerOne.board[0]!;
        const source = game.data.playerOne.board[1]!;
        const right = game.data.playerOne.board[2]!;

        assert.equal(left.attack, 3);
        assert.equal(left.health, 3);
        assert.equal(right.attack, 3);
        assert.equal(right.health, 3);
        assert.equal(source.attack, 2);
        assert.equal(source.health, 3);

        const leftCard = left.originalCard;
        assert.isTrue(leftCard.type === "MINION" && leftCard.minionPowers.hasTaunt);
        const rightCard = right.originalCard;
        assert.isTrue(rightCard.type === "MINION" && rightCard.minionPowers.hasTaunt);
    });

    test("fizzles when no adjacent allies exist", ({ assert }) => {
        const argusLike = createMinionCard({
            uuid: "argus-source",
            cost: 4,
            attack: 2,
            health: 3,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: false,
                    boost: createBoostSnapshot({ attack: 1, health: 1 }),
                    target: createMinionTargetSnapshot("PLAYER", {
                        adjacency: "SOURCE",
                        excludeSelf: true,
                    }),
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [argusLike],
                },
            }),
            argusLike,
            { boardIndex: 0 },
        );

        const source = game.data.playerOne.board[0]!;
        assert.equal(source.attack, 2);
        assert.equal(source.health, 3);
    });

    test("only buffs ally on the played side when inserted at board edge", ({ assert }) => {
        const rightAlly = createMinionCard({ uuid: "right-ally", attack: 2, health: 2 });
        const argusLike = createMinionCard({
            uuid: "argus-source",
            cost: 4,
            attack: 2,
            health: 3,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: false,
                    boost: createBoostSnapshot({ attack: 1, health: 1 }),
                    target: createMinionTargetSnapshot("PLAYER", {
                        adjacency: "SOURCE",
                        excludeSelf: true,
                    }),
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [argusLike],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(rightAlly)),
                },
            }),
            argusLike,
            { boardIndex: 0 },
        );

        assert.equal(game.data.playerOne.board[0]!.attack, 2);
        assert.equal(game.data.playerOne.board[1]!.attack, 3);
    });
});
