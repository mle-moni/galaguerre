import { MINION_SPOT_IDS } from "#api_types/game.types";
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
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
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
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
            attack: template.attack,
            health: template.health,
        });
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
        assert.isNotNull(game.data.playerOne.board.SPOT_1);
    });

    test("fails silently when board is full", ({ assert }) => {
        const board = createEmptyBoard();
        for (const spotId of MINION_SPOT_IDS) {
            board[spotId] = createMinionState(createMinionCard({ uuid: `filler-${spotId}` }));
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
        board.SPOT_1 = createMinionState(juggler);

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

        assert.isNotNull(game.data.playerTwo.board.SPOT_1);
        assert.isNull(game.data.playerOne.board.SPOT_1);
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(juggler)),
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

        assert.lengthOf(
            MINION_SPOT_IDS.filter((spotId) => game.data.playerOne.board[spotId] !== null),
            4,
        );
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(filler)),
                },
            }),
            spell,
        );

        const template = getMinionCardTemplateById(121)!;

        assert.isNotNull(game.data.playerOne.board.SPOT_1);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
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
                    board: placeMinion(createEmptyBoard(), "SPOT_2", createMinionState(juggler)),
                },
                playerTwo: { health: 20 },
            }),
            summoner,
            { spotId: "SPOT_1" },
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
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(passiveMinion),
                    ),
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
                    board: placeMinion(createEmptyBoard(), "SPOT_2", createMinionState(watcher)),
                },
                playerTwo: { health: 20 },
            }),
            battlecryMinion,
            { spotId: "SPOT_1" },
        );

        assertPlayerHealth(assert, game, "playerTwo", 17);
    });
});
