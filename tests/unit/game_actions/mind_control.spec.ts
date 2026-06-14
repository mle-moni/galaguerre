import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import {
    createBoostSnapshot,
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionPowersSnapshot,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardSpot } from "#tests/helpers/game/assertions";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";
import { runPlayCardInMemory } from "#tests/helpers/game/run_play_card_in_memory";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";
import { assertError } from "#tests/helpers/game/socket_event_collector";
import { MINION_SPOT_IDS } from "#api_types/game.types";
import { cardHasPlayableTarget } from "#api_types/target_matching";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const countBoardMinions = (board: ReturnType<typeof createEmptyBoard>) =>
    Object.values(board).filter((minion) => minion !== null).length;

test.group("MIND_CONTROL action", () => {
    test("targeted spell steals enemy minion to controller board", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", attack: 4, health: 5 });
        const spell = createSpellCard({
            cost: 8,
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: { mana: 10, hand: [spell] },
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_2",
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" } },
        );

        assert.isNull(game.data.playerTwo.board.SPOT_2);
        assert.equal(countBoardMinions(game.data.playerOne.board), 1);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", {
            attack: 4,
            health: 5,
        });
    });

    test("rejects targeted mind control spell when controller board is full", async ({
        assert,
    }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion" });
        const spell = createSpellCard({
            uuid: "mind-control-spell",
            cost: 8,
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });
        const { errors: _errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: (() => {
                        let board = createEmptyBoard();
                        for (const spotId of MINION_SPOT_IDS) {
                            board = placeMinion(
                                board,
                                spotId,
                                createMinionState(createMinionCard({ uuid: `ally-${spotId}` })),
                            );
                        }
                        return board;
                    })(),
                },
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            "playerOne",
            {
                cardId: spell.uuid,
                spotId: null,
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_1", owner: "OPPONENT" },
            },
        );

        assertError(assert, "Aucune cible valide pour cette carte");
    });

    test("cardHasPlayableTarget is false for targeted mind control with full board", ({
        assert,
    }) => {
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });
        const enemyMinion = createMinionState(createMinionCard({ uuid: "enemy" }));
        const allyMinion = createMinionState(createMinionCard({ uuid: "ally" }));

        const playerBoard = placeMinion(createEmptyBoard(), "SPOT_1", allyMinion);
        playerBoard.SPOT_2 = createMinionState(createMinionCard({ uuid: "ally-2" }));
        playerBoard.SPOT_3 = createMinionState(createMinionCard({ uuid: "ally-3" }));
        playerBoard.SPOT_4 = createMinionState(createMinionCard({ uuid: "ally-4" }));
        playerBoard.SPOT_5 = createMinionState(createMinionCard({ uuid: "ally-5" }));

        const opponentBoard = placeMinion(createEmptyBoard(), "SPOT_1", enemyMinion);

        assert.isFalse(cardHasPlayableTarget(spell, playerBoard, opponentBoard, false));
    });

    test("conditional random battlecry steals when opponent has 4+ minions", ({ assert }) => {
        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 4 },
                }),
            ],
        });

        let opponentBoard = createEmptyBoard();
        for (const spotId of MINION_SPOT_IDS.slice(0, 4)) {
            opponentBoard = placeMinion(
                opponentBoard,
                spotId,
                createMinionState(createMinionCard({ uuid: `enemy-${spotId}` })),
            );
        }

        const { game } = runBattlecry(
            createGameData({
                playerTwo: { board: opponentBoard },
            }),
            hunter,
            { spotId: "SPOT_1" },
        );

        assert.equal(countBoardMinions(game.data.playerOne.board), 2);
        assert.equal(countBoardMinions(game.data.playerTwo.board), 3);
    });

    test("conditional random battlecry fizzles when opponent has fewer than 4 minions", ({
        assert,
    }) => {
        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 4 },
                }),
            ],
        });

        const opponentBoard = placeMinion(
            createEmptyBoard(),
            "SPOT_1",
            createMinionState(createMinionCard({ uuid: "enemy-1" })),
        );

        const { game } = runBattlecry(
            createGameData({
                playerTwo: { board: opponentBoard },
            }),
            hunter,
            { spotId: "SPOT_1" },
        );

        assert.equal(countBoardMinions(game.data.playerOne.board), 1);
        assert.equal(countBoardMinions(game.data.playerTwo.board), 1);
    });

    test("conditional random battlecry fizzles when controller board is full after play", ({
        assert,
    }) => {
        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 4 },
                }),
            ],
        });

        let playerBoard = createEmptyBoard();
        for (const spotId of MINION_SPOT_IDS.slice(0, 4)) {
            playerBoard = placeMinion(
                playerBoard,
                spotId,
                createMinionState(createMinionCard({ uuid: `ally-${spotId}` })),
            );
        }

        let opponentBoard = createEmptyBoard();
        for (const spotId of MINION_SPOT_IDS.slice(0, 4)) {
            opponentBoard = placeMinion(
                opponentBoard,
                spotId,
                createMinionState(createMinionCard({ uuid: `enemy-${spotId}` })),
            );
        }

        const { game } = runBattlecry(
            createGameData({
                playerOne: { board: playerBoard },
                playerTwo: { board: opponentBoard },
            }),
            hunter,
            { spotId: "SPOT_5" },
        );

        assert.equal(countBoardMinions(game.data.playerOne.board), 5);
        assert.equal(countBoardMinions(game.data.playerTwo.board), 4);
    });

    test("reverts aura buffs when minion changes board", ({ assert }) => {
        const auraSourceCard = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 2, health: 2 }),
                        target: createMinionTargetSnapshot("PLAYER"),
                    },
                }),
            ],
        });
        const stolenCard = createMinionCard({ uuid: "stolen", attack: 2, health: 3 });
        const stolen = createMinionState(stolenCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: {
                        ...placeMinion(
                            createEmptyBoard(),
                            "SPOT_1",
                            createMinionState(auraSourceCard, { uuid: "aura-source" }),
                        ),
                        SPOT_2: stolen,
                    },
                },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerTwo, "SPOT_1");

        assertBoardSpot(assert, game, "playerTwo", "SPOT_2", { attack: 4, health: 5 });

        executeAction(
            createCardActionSnapshot({
                type: "MIND_CONTROL",
                target: createMinionTargetSnapshot("OPPONENT"),
                isTargeted: true,
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
            { spotId: "SPOT_2", owner: "OPPONENT" },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { attack: 2, health: 3 });
    });

    test("stealth minion cannot be targeted by mind control spell", ({ assert }) => {
        const stealthCard = createMinionCard({
            uuid: "stealth-minion",
            minionPowers: createMinionPowersSnapshot({ hasStealth: true }),
        });
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT"),
                    isTargeted: true,
                }),
            ],
        });

        assert.isFalse(
            cardHasPlayableTarget(
                spell,
                createEmptyBoard(),
                placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(stealthCard)),
                true,
            ),
        );
    });

    test("random mind control excludes stealth minions", ({ assert }) => {
        const visibleCard = createMinionCard({ uuid: "visible" });
        const stealthCard = createMinionCard({
            uuid: "stealth",
            minionPowers: createMinionPowersSnapshot({ hasStealth: true }),
        });

        const hunter = createMinionCard({
            uuid: "head-hunter",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "MIND_CONTROL",
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                    actionCondition: { opponentMinionCountMin: 1 },
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerTwo: {
                    board: {
                        ...placeMinion(
                            createEmptyBoard(),
                            "SPOT_1",
                            createMinionState(stealthCard),
                        ),
                        SPOT_2: createMinionState(visibleCard),
                    },
                },
            }),
            hunter,
            { spotId: "SPOT_1" },
        );

        assert.isNotNull(game.data.playerOne.board.SPOT_2);
        assert.equal(game.data.playerOne.board.SPOT_2?.uuid, "visible");
        assert.isNotNull(game.data.playerTwo.board.SPOT_1);
    });
});
