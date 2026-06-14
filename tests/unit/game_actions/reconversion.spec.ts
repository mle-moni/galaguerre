import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { killMinion } from "#galaguerre/action_engine/kill_minion";
import { applyReconversionToMinion } from "#galaguerre/action_engine/apply_reconversion";
import { applyBoostToMinion } from "#galaguerre/action_engine/apply_boost";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import {
    createBoostSnapshot,
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardSpot } from "#tests/helpers/game/assertions";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const LEGUME_CARD_ID = 121;

test.group("RECONVERSION action", () => {
    test("transforms buffed minion into Légume 1/1 with full health", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 5, health: 5, cardId: 10 });
        const target = createMinionState(targetCard);
        applyBoostToMinion(target, createBoostSnapshot({ attack: 2, health: 2 }));

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(game, game.data.playerTwo, "SPOT_1", LEGUME_CARD_ID);

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.cardId, LEGUME_CARD_ID);
        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.label, "Légume");
        assert.equal(game.data.playerTwo.board.SPOT_1!.uuid, "target");
    });

    test("silences the reconverted minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 3,
            health: 3,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 1,
                }),
            ],
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 1,
                }),
            ],
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "TURN_END",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createMinionTargetSnapshot("OPPONENT", { type: "HERO" }),
                    }),
                }),
            ],
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(game, game.data.playerTwo, "SPOT_1", LEGUME_CARD_ID);

        const card = game.data.playerTwo.board.SPOT_1!.originalCard;
        assert.isTrue(game.data.playerTwo.board.SPOT_1!.isSilenced);
        assert.equal(card.type === "MINION" ? card.battlecryActions.length : -1, 0);
        assert.equal(card.type === "MINION" ? card.deathrattleActions.length : -1, 0);
        assert.equal(card.type === "MINION" ? card.passives.length : -1, 0);
    });

    test("does not trigger deathrattle of the original minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 4,
            health: 4,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 2,
                }),
            ],
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    deckCards: [createMinionCard({ uuid: "deck-1" })],
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(game, game.data.playerTwo, "SPOT_1", LEGUME_CARD_ID);

        assert.equal(game.data.playerTwo.deckCards.length, 1);
        assert.isNotNull(game.data.playerTwo.board.SPOT_1);
    });

    test("reconverted minion does not trigger original deathrattle on kill", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    target: createMinionTargetSnapshot("OPPONENT", { type: "HERO" }),
                }),
            ],
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerOne: { health: 30 },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(game, game.data.playerTwo, "SPOT_1", LEGUME_CARD_ID);
        killMinion(game, game.data.playerTwo, "SPOT_1");

        assert.equal(game.data.playerOne.health, 30);
    });

    test("removes aura from reconverted source minion", ({ assert }) => {
        const ally = createMinionCard({ uuid: "ally", attack: 2, health: 2 });
        const auraSource = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 1, health: 1 }),
                        target: createMinionTargetSnapshot("PLAYER", { excludeSelf: true }),
                    },
                }),
            ],
        });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(ally)),
                        "SPOT_2",
                        createMinionState(auraSource),
                    ),
                },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerOne, "SPOT_2");
        assert.equal(game.data.playerOne.board.SPOT_1!.attack, 3);

        applyReconversionToMinion(game, game.data.playerOne, "SPOT_2", LEGUME_CARD_ID);

        assert.equal(game.data.playerOne.board.SPOT_1!.attack, 2);
        assert.equal(game.data.playerOne.board.SPOT_2!.attack, 1);
    });

    test("removes divine shield and taunt from reconverted minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 2,
            health: 2,
            minionPowers: {
                hasTaunt: true,
                hasCharge: false,
                hasWindfury: false,
                isPoisonous: false,
                hasStealth: false,
                hasDivineShield: true,
            },
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(game, game.data.playerTwo, "SPOT_1", LEGUME_CARD_ID);

        const card = game.data.playerTwo.board.SPOT_1!.originalCard;
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasTaunt);
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasDivineShield);
    });

    test("executeAction applies targeted reconversion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 6, health: 6 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        executeAction(
            createCardActionSnapshot({
                type: "RECONVERSION",
                isTargeted: true,
                reconvertCardId: LEGUME_CARD_ID,
                target: createMinionTargetSnapshot("ALL"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
            { spotId: "SPOT_1", owner: "OPPONENT" },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.cardId, LEGUME_CARD_ID);
    });
});
