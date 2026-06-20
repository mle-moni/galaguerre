import { test } from "@japa/runner";
import type Game from "#models/game";
import { killMinion } from "../../../app/galaguerre/action_engine/kill_minion.js";
import { refreshAurasAfterMinionPlayed } from "../../../app/galaguerre/passive_engine/refresh_passive_auras.js";
import {
    createBoostSnapshot,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

test.group("passive BOOST auras", () => {
    test("aura with excludeSelf does not buff the source minion", ({ assert }) => {
        const auraSource = createMinionCard({
            uuid: "aura-source",
            attack: 1,
            health: 4,
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 1, health: 1 }),
                        target: createMinionTargetSnapshot("PLAYER", { excludeSelf: true }),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(auraSource)),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 0);

        assert.equal(game.data.playerOne.board[0]!.attack, 1);
        assert.equal(game.data.playerOne.board[0]!.health, 4);
    });

    test("aura with excludeSelf buffs other allied minions only", ({ assert }) => {
        const ally = createMinionCard({ uuid: "ally-minion", attack: 2, health: 2 });
        const auraSource = createMinionCard({
            uuid: "aura-source",
            attack: 1,
            health: 4,
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 1, health: 1 }),
                        target: createMinionTargetSnapshot("PLAYER", { excludeSelf: true }),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(ally)),
                    1,
                    createMinionState(auraSource),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        assert.equal(game.data.playerOne.board[0]!.attack, 3);
        assert.equal(game.data.playerOne.board[1]!.attack, 1);
    });

    test("aura gives +1/+1 to allied minions when played", ({ assert }) => {
        const ally = createMinionCard({ uuid: "ally-minion", attack: 2, health: 2 });
        const auraSource = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 1, health: 1 }),
                        target: createMinionTargetSnapshot("PLAYER"),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(ally)),
            },
        });

        const game = createGame(data);
        game.data.playerOne.board[1] = createMinionState(auraSource);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        assert.equal(game.data.playerOne.board[0]!.attack, 3);
        assert.equal(game.data.playerOne.board[0]!.health, 3);
        assert.equal(game.data.playerOne.board[0]!.maxHealth, 3);
    });

    test("tagged aura does not revert from a different minion at the same spot", ({ assert }) => {
        const murloc = createMinionCard({
            uuid: "murloc-minion",
            attack: 1,
            health: 1,
            tags: ["DEVELOPPEUR"],
        });
        const stormwindKnight = createMinionCard({
            uuid: "stormwind-knight",
            attack: 2,
            health: 5,
        });
        const warleader = createMinionCard({
            uuid: "warleader",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 2 }),
                        target: createMinionTargetSnapshot("PLAYER", {
                            tag: "DEVELOPPEUR",
                            excludeSelf: true,
                        }),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(murloc)),
                    1,
                    createMinionState(warleader),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        assert.equal(game.data.playerOne.board[0]!.attack, 3);

        killMinion(game, game.data.playerOne, "murloc-minion");

        game.data.playerOne.board[0] = createMinionState(stormwindKnight);

        killMinion(game, game.data.playerOne, warleader.uuid);

        assert.equal(game.data.playerOne.board[0]!.attack, 2);
        assert.equal(game.data.playerOne.board[0]!.health, 5);
    });

    test("aura stats are reverted when source minion dies", ({ assert }) => {
        const ally = createMinionCard({ uuid: "ally-minion", attack: 2, health: 2 });
        const auraSource = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 1, health: 1 }),
                        target: createMinionTargetSnapshot("PLAYER"),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(ally)),
                    1,
                    createMinionState(auraSource),
                ),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);

        assert.equal(game.data.playerOne.board[0]!.attack, 3);

        killMinion(game, game.data.playerOne, "aura-source");

        assert.equal(game.data.playerOne.board[0]!.attack, 2);
        assert.equal(game.data.playerOne.board[0]!.health, 2);
        assert.equal(game.data.playerOne.board[0]!.maxHealth, 2);
    });

    test("hero spell power aura is reverted when source minion dies", ({ assert }) => {
        const auraSource = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    action: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ spellPower: 2 }),
                        target: createHeroTargetSnapshot("PLAYER"),
                    },
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                spellPower: 0,
                board: placeMinion(createEmptyBoard(), 0, createMinionState(auraSource)),
            },
        });

        const game = createGame(data);
        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 0);

        assert.equal(game.data.playerOne.spellPower, 2);

        killMinion(game, game.data.playerOne, "aura-source");

        assert.equal(game.data.playerOne.spellPower, 0);
    });
});
