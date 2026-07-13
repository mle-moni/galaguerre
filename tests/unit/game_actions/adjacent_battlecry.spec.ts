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

    test("grants stealth to adjacent allies when played between them", ({ assert }) => {
        const leftAlly = createMinionCard({ uuid: "left-ally", attack: 1, health: 2 });
        const rightAlly = createMinionCard({ uuid: "right-ally", attack: 1, health: 2 });
        const phoneboxLike = createMinionCard({
            uuid: "phonebox-source",
            cost: 2,
            attack: 0,
            health: 4,
            minionPowers: { hasTaunt: true },
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: false,
                    boost: createBoostSnapshot({
                        minionPowers: { hasStealth: true },
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
                    hand: [phoneboxLike],
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(leftAlly)),
                        1,
                        createMinionState(rightAlly),
                    ),
                },
            }),
            phoneboxLike,
            { boardIndex: 1 },
        );

        const leftCard = game.data.playerOne.board[0]!.originalCard;
        const sourceCard = game.data.playerOne.board[1]!.originalCard;
        const rightCard = game.data.playerOne.board[2]!.originalCard;

        assert.isTrue(leftCard.type === "MINION" && leftCard.minionPowers.hasStealth);
        assert.isFalse(sourceCard.type === "MINION" && sourceCard.minionPowers.hasStealth);
        assert.isTrue(rightCard.type === "MINION" && rightCard.minionPowers.hasStealth);
    });

    test("does not grant stealth to allies that become adjacent later", ({ assert }) => {
        const leftAlly = createMinionCard({ uuid: "left-ally", attack: 1, health: 2 });
        const phoneboxLike = createMinionCard({
            uuid: "phonebox-source",
            cost: 2,
            attack: 0,
            health: 4,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: false,
                    boost: createBoostSnapshot({
                        minionPowers: { hasStealth: true },
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
                    hand: [phoneboxLike],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(leftAlly)),
                },
            }),
            phoneboxLike,
            { boardIndex: 1 },
        );

        const leftCard = game.data.playerOne.board[0]!.originalCard;
        assert.isTrue(leftCard.type === "MINION" && leftCard.minionPowers.hasStealth);

        const inserted = createMinionState(
            createMinionCard({ uuid: "inserted", attack: 1, health: 1 }),
        );
        game.data.playerOne.board.splice(1, 0, inserted);

        const insertedCard = game.data.playerOne.board[1]!.originalCard;
        assert.isFalse(insertedCard.type === "MINION" && insertedCard.minionPowers.hasStealth);
    });
});
