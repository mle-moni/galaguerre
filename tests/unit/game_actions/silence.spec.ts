import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { killMinion } from "#galaguerre/action_engine/kill_minion";
import { applySilenceToMinion } from "#galaguerre/action_engine/apply_silence";
import { applyBoostToMinion } from "#galaguerre/action_engine/apply_boost";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import { triggerPassives } from "#galaguerre/passive_engine/trigger_passives";
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
import { runBattlecry } from "#tests/helpers/game/run_battlecry";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

test.group("SILENCE action", () => {
    test("removes +2/+2 buff from minion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 2, health: 3 });
        const target = createMinionState(targetCard);
        applyBoostToMinion(target, createBoostSnapshot({ attack: 2, health: 2 }));

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        executeAction(
            createCardActionSnapshot({
                type: "SILENCE",
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 2,
            health: 3,
            maxHealth: 3,
        });
        assert.isTrue(game.data.playerTwo.board.SPOT_1!.isSilenced);
    });

    test("preserves damage on unbuffed minion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 4, health: 5 });
        const target = createMinionState(targetCard, { health: 3, maxHealth: 5 });

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 4,
            health: 3,
            maxHealth: 5,
        });
    });

    test("buffed then damaged minion resets to printed stats", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 1, health: 1 });
        const target = createMinionState(targetCard);
        applyBoostToMinion(target, createBoostSnapshot({ attack: 4, health: 4 }));
        target.health = 3;
        target.maxHealth = 5;
        target.attack = 5;

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
    });

    test("removes native taunt from minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 2,
            health: 4,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");

        const card = game.data.playerTwo.board.SPOT_1!.originalCard;
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasTaunt);
    });

    test("removes taunt granted by boost", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 2, health: 2 });
        const target = createMinionState(targetCard);
        applyBoostToMinion(target, {
            attack: null,
            health: null,
            spellPower: null,
            minionPowers: {
                hasTaunt: true,
                hasCharge: false,
                hasWindfury: false,
                isPoisonous: false,
            },
        });

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");

        const card = game.data.playerTwo.board.SPOT_1!.originalCard;
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasTaunt);
    });

    test("disables deathrattle", ({ assert }) => {
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
        const target = createMinionState(targetCard, { isSilenced: true });

        const game = createGame(
            createGameData({
                playerOne: { health: 30 },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        killMinion(game, game.data.playerTwo, "SPOT_1");

        assert.equal(game.data.playerOne.health, 30);
    });

    test("disables TURN_END passive", ({ assert }) => {
        const passiveMinionCard = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "TURN_END",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 3,
                        target: createMinionTargetSnapshot("OPPONENT", { type: "HERO" }),
                    }),
                }),
            ],
        });

        const game = createGame(
            createGameData({
                playerOne: { health: 30 },
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(passiveMinionCard, { isSilenced: true }),
                    ),
                },
            }),
        );

        triggerPassives(game, "TURN_END", game.data.playerTwo);

        assert.equal(game.data.playerOne.health, 30);
    });

    test("silencing aura source removes buff from allies", ({ assert }) => {
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

        applySilenceToMinion(game, game.data.playerOne, "SPOT_2");

        assert.equal(game.data.playerOne.board.SPOT_1!.attack, 2);
        assert.equal(game.data.playerOne.board.SPOT_1!.health, 2);
    });

    test("external aura survives silence on target", ({ assert }) => {
        const target = createMinionCard({ uuid: "target", attack: 1, health: 1 });
        const auraSource = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 2 }),
                        target: createMinionTargetSnapshot("PLAYER"),
                    },
                }),
            ],
        });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(target)),
                        "SPOT_2",
                        createMinionState(auraSource),
                    ),
                },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerOne, "SPOT_2");
        applyBoostToMinion(
            game.data.playerOne.board.SPOT_1!,
            createBoostSnapshot({ attack: 5, health: 5 }),
        );
        game.data.playerOne.board.SPOT_1!.attack = 8;
        game.data.playerOne.board.SPOT_1!.health = 6;
        game.data.playerOne.board.SPOT_1!.maxHealth = 6;

        applySilenceToMinion(game, game.data.playerOne, "SPOT_1");

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
            attack: 3,
            health: 1,
            maxHealth: 1,
        });
    });

    test("mass silence affects all matching enemy minions", ({ assert }) => {
        const minion1 = createMinionState(
            createMinionCard({ uuid: "enemy-1", attack: 2, health: 2 }),
        );
        const minion2 = createMinionState(
            createMinionCard({ uuid: "enemy-2", attack: 3, health: 3 }),
        );
        applyBoostToMinion(minion1, createBoostSnapshot({ attack: 1, health: 1 }));
        applyBoostToMinion(minion2, createBoostSnapshot({ attack: 2, health: 2 }));

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), "SPOT_1", minion1),
                        "SPOT_2",
                        minion2,
                    ),
                },
            }),
        );

        executeAction(
            createCardActionSnapshot({
                type: "SILENCE",
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assert.isTrue(game.data.playerTwo.board.SPOT_1!.isSilenced);
        assert.isTrue(game.data.playerTwo.board.SPOT_2!.isSilenced);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { attack: 2, health: 2 });
        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { attack: 3, health: 3 });
    });

    test("double silence is idempotent", ({ assert }) => {
        const target = createMinionState(
            createMinionCard({ uuid: "target", attack: 2, health: 2 }),
        );
        applyBoostToMinion(target, createBoostSnapshot({ attack: 2, health: 2 }));

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");
        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 2,
            health: 2,
            maxHealth: 2,
        });
    });

    test("targeted silence via battlecry", ({ assert }) => {
        const enemyCard = createMinionCard({ uuid: "enemy", attack: 1, health: 1 });
        const enemyMinion = createMinionState(enemyCard);
        applyBoostToMinion(enemyMinion, createBoostSnapshot({ attack: 3, health: 3 }));

        const handCard = createMinionCard({
            uuid: "silencer",
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "SILENCE",
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", enemyMinion),
                },
            }),
            handCard,
            { actionTarget: { spotId: "SPOT_1", owner: "OPPONENT" } },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.isTrue(game.data.playerTwo.board.SPOT_1!.isSilenced);
    });
});
