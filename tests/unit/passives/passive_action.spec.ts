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
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";

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
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
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
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
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
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
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
                    placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
                    "SPOT_2",
                    createMinionState(allyMinion),
                ),
            },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_END", game.data.playerOne);

        assert.isFalse(gameEnded);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 3 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 2 });
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
                    placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
                    "SPOT_2",
                    createMinionState(allyMinion),
                ),
            },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_END", game.data.playerOne);

        assert.isFalse(gameEnded);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 2 });
        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { health: 2 });
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
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
            },
            playerTwo: { health: 10 },
        });

        const game = createGame(data);
        const { gameEnded } = triggerPassives(game, "TURN_BEGIN", game.data.playerOne);

        assert.isTrue(gameEnded);
        assertPlayerHealth(assert, game, "playerTwo", -5);
    });
});
