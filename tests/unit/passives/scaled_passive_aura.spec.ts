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

const createScaledPetsAttackSource = () =>
    createMinionCard({
        uuid: "scaled-source",
        attack: 2,
        health: 4,
        tags: ["PETS"],
        passives: [
            createPassiveSnapshot({
                type: "BOOST",
                triggersOn: null,
                action: null,
                passiveBoost: {
                    boost: createBoostSnapshot({ attack: 1 }),
                    target: createMinionTargetSnapshot("ALL", {
                        tag: "PETS",
                        excludeSelf: true,
                    }),
                    scaleToSource: true,
                },
            }),
        ],
    });

const createPetsMinion = (uuid: string) =>
    createMinionCard({
        uuid,
        attack: 1,
        health: 1,
        tags: ["PETS"],
    });

test.group("scaled passive BOOST auras", () => {
    test("gains attack for each other pets minion on the board", ({ assert }) => {
        const petOne = createPetsMinion("pet-one");
        const petTwo = createPetsMinion("pet-two");
        const scaledSource = createScaledPetsAttackSource();

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(petOne)),
                        1,
                        createMinionState(petTwo),
                    ),
                    2,
                    createMinionState(scaledSource),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 2);

        assert.equal(game.data.playerOne.board[2]!.attack, 4);
    });

    test("updates attack when another pets minion is played", ({ assert }) => {
        const petOne = createPetsMinion("pet-one");
        const scaledSource = createScaledPetsAttackSource();
        const petTwo = createPetsMinion("pet-two");

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(petOne)),
                    1,
                    createMinionState(scaledSource),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);
        assert.equal(game.data.playerOne.board[1]!.attack, 3);

        game.data.playerOne.board[2] = createMinionState(petTwo);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 2);

        assert.equal(game.data.playerOne.board[1]!.attack, 4);
    });

    test("reverts scaled attack when a pets minion dies", ({ assert }) => {
        const petOne = createPetsMinion("pet-one");
        const petTwo = createPetsMinion("pet-two");
        const scaledSource = createScaledPetsAttackSource();

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(petOne)),
                        1,
                        createMinionState(petTwo),
                    ),
                    2,
                    createMinionState(scaledSource),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 2);
        assert.equal(game.data.playerOne.board[2]!.attack, 4);

        killMinion(game, game.data.playerOne, "pet-one");

        assert.equal(game.data.playerOne.board[1]!.attack, 3);
    });
});
