import { MAX_BOARD_MINIONS } from "#api_types/board";
import { test } from "@japa/runner";
import type Game from "#models/game";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { getMinionCardTemplateById } from "#galaguerre/card_catalog";
import { summonMinions } from "#galaguerre/action_engine/summon_minion";
import { triggerSummonPassives } from "#galaguerre/passive_engine/trigger_summon_passives";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    createReconvertParametersSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardIndex, assertPlayerHealth } from "#tests/helpers/game/assertions";
import { runPlayMinion } from "#tests/helpers/game/run_play_minion";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

const minionSummonFilter = createCardFilterSnapshot({ type: "MINION" });

test.group("SUMMON action", () => {
    test("summons a minion by cardId on controller board", ({ assert }) => {
        const template = getMinionCardTemplateById(121)!;
        const game = createGame(createGameData({ playerOne: { board: createEmptyBoard() } }));

        const { summonedCards } = summonMinions(
            game,
            game.data.playerOne,
            "PLAYER",
            createReconvertParametersSnapshot({ cardId: template.cardId }),
            1,
        );

        assert.lengthOf(summonedCards, 1);
        assertBoardIndex(assert, game, "playerOne", 0, {
            attack: template.attack,
            health: template.health,
        });
    });

    test("uses golden art when owner has the card in golden collection", ({ assert }) => {
        const template = getMinionCardTemplateById(181)!;
        const game = createGame(
            createGameData({
                playerOne: {
                    board: createEmptyBoard(),
                    ownedGoldenCardIds: [181],
                },
            }),
        );

        const { summonedCards } = summonMinions(
            game,
            game.data.playerOne,
            "PLAYER",
            createReconvertParametersSnapshot({ cardId: template.cardId }),
            1,
        );

        assert.lengthOf(summonedCards, 1);
        assert.isTrue(summonedCards[0]!.isGolden);
        assert.isTrue(game.data.playerOne.board[0]!.originalCard.isGolden);
    });

    test("does not use golden art for opponent summons without golden ownership", ({ assert }) => {
        const template = getMinionCardTemplateById(181)!;
        const game = createGame(
            createGameData({
                playerOne: {
                    board: createEmptyBoard(),
                    ownedGoldenCardIds: [181],
                },
                playerTwo: { board: createEmptyBoard() },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON",
            summonParameters: createReconvertParametersSnapshot({ cardId: template.cardId }),
            summonCount: 1,
            summonTargetTeam: "OPPONENT",
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.isFalse(game.data.playerTwo.board[0]!.originalCard.isGolden);
    });

    test("summoned minion does not trigger battlecry", ({ assert }) => {
        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard() },
                playerTwo: { health: 20 },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON",
            summonParameters: createReconvertParametersSnapshot({ cardId: 79 }),
            summonCount: 1,
            summonTargetTeam: "PLAYER",
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerTwo", 20);
        assert.isNotNull(game.data.playerOne.board[0]);
    });

    test("fails silently when board is full", ({ assert }) => {
        let board = createEmptyBoard();
        for (let boardIndex = 0; boardIndex < MAX_BOARD_MINIONS; boardIndex++) {
            board = placeMinion(
                board,
                boardIndex,
                createMinionState(createMinionCard({ uuid: `filler-${boardIndex}` })),
            );
        }

        const juggler = createMinionCard({
            uuid: "knife-juggler",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "SUMMON",
                    summonFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });
        board[0] = createMinionState(juggler);

        const game = createGame(
            createGameData({
                playerOne: { board },
                playerTwo: { health: 20 },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON",
            summonParameters: createReconvertParametersSnapshot({ cardId: 121 }),
            summonCount: 1,
            summonTargetTeam: "PLAYER",
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerTwo", 20);
    });

    test("summons on opponent board with summonTargetTeam OPPONENT", ({ assert }) => {
        const game = createGame(
            createGameData({
                playerOne: { board: createEmptyBoard() },
                playerTwo: { board: createEmptyBoard() },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON",
            summonParameters: createReconvertParametersSnapshot({ cardId: 121 }),
            summonCount: 1,
            summonTargetTeam: "OPPONENT",
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.isNotNull(game.data.playerTwo.board[0]);
        assert.equal(game.data.playerOne.board.length, 0);
    });

    test("multi-summon places all minions then triggers passives", ({ assert }) => {
        const juggler = createMinionCard({
            uuid: "knife-juggler",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "SUMMON",
                    summonFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(juggler)),
                },
                playerTwo: { health: 20 },
            }),
        );

        const action = createCardActionSnapshot({
            type: "SUMMON",
            summonParameters: createReconvertParametersSnapshot({ cardId: 121 }),
            summonCount: 3,
            summonTargetTeam: "PLAYER",
        });

        executeAction(action, game, game.data.playerOne, game.data.playerTwo);

        assert.equal(game.data.playerOne.board.length, 4);
        assertPlayerHealth(assert, game, "playerTwo", 17);
    });

    test("DESTROY ALL then SUMMON resolves deaths first", ({ assert }) => {
        const filler = createMinionCard({ uuid: "filler", health: 1 });
        const spell = createSpellCard({
            cost: 0,
            spellActions: [
                createCardActionSnapshot({
                    type: "DESTROY",
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
                createCardActionSnapshot({
                    type: "SUMMON",
                    summonParameters: createReconvertParametersSnapshot({ cardId: 121 }),
                    summonCount: 1,
                    summonTargetTeam: "PLAYER",
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(filler)),
                },
            }),
            spell,
        );

        const template = getMinionCardTemplateById(121)!;

        assert.isNotNull(game.data.playerOne.board[0]);
        assertBoardIndex(assert, game, "playerOne", 0, {
            attack: template.attack,
            health: template.health,
        });
    });

    test("battlecry SUMMON triggers juggler for token then for played minion", async ({
        assert,
    }) => {
        const juggler = createMinionCard({
            uuid: "knife-juggler",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "SUMMON",
                    summonFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const summoner = createMinionCard({
            uuid: "summoner",
            cost: 1,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "SUMMON",
                    summonParameters: createReconvertParametersSnapshot({ cardId: 121 }),
                    summonCount: 1,
                    summonTargetTeam: "PLAYER",
                }),
            ],
        });

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [summoner],
                    board: placeMinion(createEmptyBoard(), 1, createMinionState(juggler)),
                },
                playerTwo: { health: 20 },
            }),
            summoner,
            { boardIndex: 0 },
        );

        assertPlayerHealth(assert, game, "playerTwo", 18);
    });
});

test.group("SUMMON passive triggers", () => {
    test("SUMMON filter deals damage to opponent hero after a minion is summoned", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "knife-juggler",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "SUMMON",
                    summonFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                },
                playerTwo: { health: 15 },
            }),
        );

        triggerSummonPassives(
            game,
            game.data.playerOne,
            createMinionCard({ uuid: "summoned-minion", cost: 1 }),
        );

        assertPlayerHealth(assert, game, "playerTwo", 14);
    });

    test("triggers after battlecry when playing a minion", async ({ assert }) => {
        const watcher = createMinionCard({
            uuid: "watcher",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "SUMMON",
                    summonFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });
        const battlecryMinion = createMinionCard({
            uuid: "battlecry-minion",
            cost: 1,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [battlecryMinion],
                    board: placeMinion(createEmptyBoard(), 1, createMinionState(watcher)),
                },
                playerTwo: { health: 20 },
            }),
            battlecryMinion,
            { boardIndex: 0 },
        );

        assertPlayerHealth(assert, game, "playerTwo", 17);
    });
});
