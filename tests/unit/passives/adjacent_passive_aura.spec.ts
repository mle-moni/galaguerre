import { test } from "@japa/runner";
import type Game from "#models/game";
import { killMinion } from "#galaguerre/action_engine/kill_minion";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import {
    createBoostSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

test.group("adjacent passive BOOST auras", () => {
    test("grants stealth to adjacent allies", ({ assert }) => {
        const leftAlly = createMinionCard({ uuid: "left-ally", attack: 1, health: 2 });
        const phoneboxLike = createMinionCard({
            uuid: "phonebox-source",
            attack: 0,
            health: 4,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({
                            minionPowers: { hasStealth: true },
                        }),
                        target: createMinionTargetSnapshot("PLAYER", {
                            adjacency: "SOURCE",
                            excludeSelf: true,
                        }),
                    },
                }),
            ],
        });
        const rightAlly = createMinionCard({ uuid: "right-ally", attack: 1, health: 2 });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(leftAlly)),
                        1,
                        createMinionState(phoneboxLike),
                    ),
                    2,
                    createMinionState(rightAlly),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        const leftCard = game.data.playerOne.board[0]!.originalCard;
        const sourceCard = game.data.playerOne.board[1]!.originalCard;
        const rightCard = game.data.playerOne.board[2]!.originalCard;

        assert.isTrue(leftCard.type === "MINION" && leftCard.minionPowers.hasStealth);
        assert.isFalse(sourceCard.type === "MINION" && sourceCard.minionPowers.hasStealth);
        assert.isTrue(rightCard.type === "MINION" && rightCard.minionPowers.hasStealth);
    });

    test("removes stealth from adjacent allies when aura source dies", ({ assert }) => {
        const leftAlly = createMinionCard({ uuid: "left-ally", attack: 1, health: 2 });
        const phoneboxLike = createMinionCard({
            uuid: "phonebox-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({
                            minionPowers: { hasStealth: true },
                        }),
                        target: createMinionTargetSnapshot("PLAYER", {
                            adjacency: "SOURCE",
                            excludeSelf: true,
                        }),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(leftAlly)),
                    1,
                    createMinionState(phoneboxLike),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        killMinion(game, game.data.playerOne, "phonebox-source");

        const leftCard = game.data.playerOne.board[0]!.originalCard;
        assert.isFalse(leftCard.type === "MINION" && leftCard.minionPowers.hasStealth);
    });

    test("grants stealth when a minion becomes adjacent after a death", ({ assert }) => {
        const filler = createMinionCard({ uuid: "filler", attack: 1, health: 1 });
        const leftAlly = createMinionCard({ uuid: "left-ally", attack: 1, health: 2 });
        const phoneboxLike = createMinionCard({
            uuid: "phonebox-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({
                            minionPowers: { hasStealth: true },
                        }),
                        target: createMinionTargetSnapshot("PLAYER", {
                            adjacency: "SOURCE",
                            excludeSelf: true,
                        }),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(leftAlly)),
                        1,
                        createMinionState(filler),
                    ),
                    2,
                    createMinionState(phoneboxLike),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 2);

        const leftBefore = game.data.playerOne.board[0]!.originalCard;
        assert.isFalse(leftBefore.type === "MINION" && leftBefore.minionPowers.hasStealth);

        killMinion(game, game.data.playerOne, "filler");

        const leftAfter = game.data.playerOne.board[0]!.originalCard;
        assert.isTrue(leftAfter.type === "MINION" && leftAfter.minionPowers.hasStealth);
    });

    test("removes stealth when a minion is no longer adjacent", ({ assert }) => {
        const leftAlly = createMinionCard({ uuid: "left-ally", attack: 1, health: 2 });
        const phoneboxLike = createMinionCard({
            uuid: "phonebox-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({
                            minionPowers: { hasStealth: true },
                        }),
                        target: createMinionTargetSnapshot("PLAYER", {
                            adjacency: "SOURCE",
                            excludeSelf: true,
                        }),
                    },
                }),
            ],
        });
        const rightAlly = createMinionCard({ uuid: "right-ally", attack: 1, health: 2 });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(leftAlly)),
                        1,
                        createMinionState(phoneboxLike),
                    ),
                    2,
                    createMinionState(rightAlly),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        const leftBefore = game.data.playerOne.board[0]!.originalCard;
        assert.isTrue(leftBefore.type === "MINION" && leftBefore.minionPowers.hasStealth);

        const inserted = createMinionState(
            createMinionCard({ uuid: "inserted", attack: 1, health: 1 }),
        );
        game.data.playerOne.board.splice(1, 0, inserted);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        const leftAfter = game.data.playerOne.board[0]!.originalCard;
        assert.isFalse(leftAfter.type === "MINION" && leftAfter.minionPowers.hasStealth);
    });
});
