import { test } from "@japa/runner";
import type Game from "#models/game";
import { drawOneCard } from "../../../app/galaguerre/draw_cards.js";
import { executeAction } from "../../../app/galaguerre/action_engine/execute_action.js";
import { triggerPassives } from "../../../app/galaguerre/passive_engine/trigger_passives.js";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardIndex, assertPlayerHealth } from "#tests/helpers/game/assertions";

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

test.group("passive ACTION triggers", () => {
    test("TURN_END passive deals damage to opponent hero", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "TURN_END",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 2,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            currentRound: 1,
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_END", game.data.playerOne);

        assert.isFalse(gameEnded);
        assertPlayerHealth(assert, game, "playerTwo", 13);
    });

    test("DRAW passive draws a card for the active player", ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card", cardId: 99 });
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DRAW",
                    action: createCardActionSnapshot({
                        type: "DRAW",
                        drawCount: 1,
                    }),
                }),
            ],
        });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                deckCards: [deckCard],
                hand: [],
            },
        });

        const game = createGame(data);
        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerOne.hand.length, 1);
        assert.equal(game.data.playerOne.hand[0]!.uuid, "deck-card");
    });

    test("HEAL passive triggers on any heal", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "HEAL",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                health: 10,
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        executeAction(
            createCardActionSnapshot({
                type: "HEAL",
                heal: 2,
                target: createHeroTargetSnapshot("PLAYER"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assert.equal(game.data.playerOne.health, 12);
        assertPlayerHealth(assert, game, "playerTwo", 14);
    });

    test("TURN_END passive with excludeSelf damages other allied minions only", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            health: 3,
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "TURN_END",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createMinionTargetSnapshot("PLAYER", { excludeSelf: true }),
                    }),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 3 });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            currentRound: 1,
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                    1,
                    createMinionState(allyMinion),
                ),
            },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_END", game.data.playerOne);

        assert.isFalse(gameEnded);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 3 });
        assertBoardIndex(assert, game, "playerOne", 1, { health: 2 });
    });

    test("TURN_END passive with onlySelf boosts only the source minion", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            attack: 1,
            health: 1,
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "TURN_END",
                    action: createCardActionSnapshot({
                        type: "BOOST",
                        boost: {
                            attack: 1,
                            health: 1,
                            spellPower: null,
                            extraBattlecryTriggers: null,
                            minionPowers: null,
                        },
                        target: createMinionTargetSnapshot("PLAYER", { onlySelf: true }),
                    }),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", attack: 2, health: 2 });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            currentRound: 1,
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                    1,
                    createMinionState(allyMinion),
                ),
            },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_END", game.data.playerOne);

        assert.isFalse(gameEnded);
        assertBoardIndex(assert, game, "playerOne", 0, { attack: 2, health: 2 });
        assertBoardIndex(assert, game, "playerOne", 1, { attack: 2, health: 2 });
    });

    test("TURN_END passive without excludeSelf damages all allied minions", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            health: 3,
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "TURN_END",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createMinionTargetSnapshot("PLAYER"),
                    }),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 3 });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            currentRound: 1,
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                    1,
                    createMinionState(allyMinion),
                ),
            },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_END", game.data.playerOne);

        assert.isFalse(gameEnded);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 2 });
        assertBoardIndex(assert, game, "playerOne", 1, { health: 2 });
    });

    test("TURN_BEGIN passive can end the game", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "TURN_BEGIN",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 15,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
            },
            playerTwo: { health: 10 },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_BEGIN", game.data.playerOne);

        assert.isTrue(gameEnded);
        assertPlayerHealth(assert, game, "playerTwo", -5);
    });

    test("DAMAGE passive triggers when allied minion takes damage", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DAMAGE",
                    triggerTargetFilter: createMinionTargetSnapshot("PLAYER"),
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 5 });

        const data = createGameData({
            playerOne: {
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                    1,
                    createMinionState(allyMinion),
                ),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        executeAction(
            createCardActionSnapshot({
                type: "DAMAGE",
                damage: 2,
                isTargeted: true,
                target: createMinionTargetSnapshot("PLAYER"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
            { minionUuid: "ally-minion", owner: "PLAYER" },
        );

        assertPlayerHealth(assert, game, "playerTwo", 14);
        assertBoardIndex(assert, game, "playerOne", 1, { health: 3 });
    });

    test("DAMAGE passive with onlySelf triggers when the source minion takes damage", ({
        assert,
    }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            health: 5,
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DAMAGE",
                    triggerTargetFilter: createMinionTargetSnapshot("PLAYER", { onlySelf: true }),
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        executeAction(
            createCardActionSnapshot({
                type: "DAMAGE",
                damage: 2,
                isTargeted: true,
                target: createMinionTargetSnapshot("PLAYER"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
            { minionUuid: "passive-minion", owner: "PLAYER" },
        );

        assertPlayerHealth(assert, game, "playerTwo", 14);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 3 });
    });

    test("DAMAGE passive with filter does not trigger on non-matching target", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DAMAGE",
                    triggerTargetFilter: createMinionTargetSnapshot("PLAYER"),
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        executeAction(
            createCardActionSnapshot({
                type: "DAMAGE",
                damage: 2,
                target: createHeroTargetSnapshot("OPPONENT"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assertPlayerHealth(assert, game, "playerTwo", 13);
    });

    test("HEAL passive with ally minion filter triggers only for matching minion heal", ({
        assert,
    }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "HEAL",
                    triggerTargetFilter: createMinionTargetSnapshot("PLAYER", {
                        excludeSelf: true,
                    }),
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 4 });

        const data = createGameData({
            playerOne: {
                health: 10,
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                    1,
                    createMinionState(allyMinion, { health: 2 }),
                ),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        executeAction(
            createCardActionSnapshot({
                type: "HEAL",
                heal: 2,
                target: createMinionTargetSnapshot("PLAYER"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assertBoardIndex(assert, game, "playerOne", 1, { health: 4 });
        assertPlayerHealth(assert, game, "playerTwo", 14);
    });

    test("HEAL passive with hero filter does not trigger on minion heal", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "HEAL",
                    triggerTargetFilter: createHeroTargetSnapshot("PLAYER"),
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 4 });

        const data = createGameData({
            playerOne: {
                health: 10,
                board: placeMinion(
                    placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                    1,
                    createMinionState(allyMinion, { health: 2 }),
                ),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        executeAction(
            createCardActionSnapshot({
                type: "HEAL",
                heal: 2,
                target: createMinionTargetSnapshot("PLAYER"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assertBoardIndex(assert, game, "playerOne", 1, { health: 4 });
        assertPlayerHealth(assert, game, "playerTwo", 15);
    });
});
