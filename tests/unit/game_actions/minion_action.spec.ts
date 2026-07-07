import { DEFAULT_HERO_HEALTH, MinionCard } from "#api_types/game.types";
import type { SocketEventByKey } from "#api_types/socket_events";
import { test } from "@japa/runner";
import {
    assertBoardIndex,
    assertIsFinished,
    assertPlayerHealth,
} from "#tests/helpers/game/assertions";
import { applyBoostToMinion } from "#galaguerre/action_engine/apply_boost";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import {
    createBoostSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runMinionCombat, runMinionCombatOnGame } from "#tests/helpers/game/run_minion_combat";
import {
    runMinionActionInMemory,
    runMinionActionOnGameInMemory,
} from "#tests/helpers/game/run_minion_action_in_memory";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { minionToHeroAction } from "#controllers/games/minion_action/minion_to_hero_action";
import {
    assertError,
    getEmittedEvents,
    installSocketCollector,
    restoreSocketCollector,
} from "#tests/helpers/game/socket_event_collector";

test.group("minion combat", () => {
    test("normal minion vs minion combat subtracts health from both", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerOne", 0, {
            health: 1,
            attacksThisRound: 1,
        });
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 1 });
    });

    test("aura-buffed minion keeps combat damage after target death refreshes auras", async ({
        assert,
    }) => {
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
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 1,
            minionPowers: { hasCharge: true },
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 3,
        });

        const setupGame = createInMemoryGame({
            ...createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(attackerCard)),
                        1,
                        createMinionState(auraSource),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
            isTraining: true,
        });
        refreshAurasAfterMinionPlayed(setupGame, setupGame.data.playerOne, 1);

        const { game } = await runMinionCombatOnGame(setupGame);

        assertBoardIndex(assert, game, "playerOne", 0, {
            attack: 4,
            health: 1,
            maxHealth: 2,
            attacksThisRound: 1,
        });
        assertBoardIndex(assert, game, "playerTwo", 0, null);
    });

    test("directly buffed minion takes counter damage after attacking", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 1,
            minionPowers: { hasCharge: true },
        });
        const attacker = createMinionState(attackerCard);
        applyBoostToMinion(attacker, createBoostSnapshot({ attack: 1, health: 1 }));

        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 3,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(createGameData().playerOne.board, 0, attacker),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerOne", 0, {
            attack: 4,
            health: 1,
            attacksThisRound: 1,
        });
        assertBoardIndex(assert, game, "playerTwo", 0, null);
    });

    test("poisonous minion kills high health target", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            minionPowers: { isPoisonous: true },
            effects: ["Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 9,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertBoardIndex(assert, game, "playerOne", 0, null);
    });

    test("poisonous kill records pulse trigger on attacker before target death", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            minionPowers: { isPoisonous: true },
            effects: ["Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 9,
        });

        installSocketCollector();
        try {
            await runMinionCombat(
                createGameData({
                    playerOne: {
                        board: placeMinion(
                            createGameData().playerOne.board,
                            0,
                            createMinionState(attackerCard),
                        ),
                    },
                    playerTwo: {
                        board: placeMinion(
                            createGameData().playerTwo.board,
                            0,
                            createMinionState(targetCard),
                        ),
                    },
                }),
            );
        } finally {
            restoreSocketCollector();
        }

        const viewerUpdate = getEmittedEvents().find(
            (event) => event.event === "game:update" && event.rooms === "users:1",
        );
        assert.isDefined(viewerUpdate);

        const presentation = (viewerUpdate!.data as SocketEventByKey["game:update"]).presentation;
        assert.isDefined(presentation);

        const attackBeat = presentation!.beats.find((beat) => beat.kind === "ATTACK");
        assert.isDefined(attackBeat);

        const effects = attackBeat!.effects;
        const combatDamageIndex = effects.findIndex((effect) => effect.type === "COMBAT_DAMAGE");
        const poisonousPulseIndex = effects.findIndex(
            (effect) => effect.type === "TRIGGER" && effect.trigger === "POISONOUS",
        );
        const killIndex = effects.findIndex(
            (effect) => effect.type === "KILL" && effect.cardUuid === MINION_IDS.target,
        );

        assert.isTrue(combatDamageIndex >= 0);
        assert.isTrue(poisonousPulseIndex > combatDamageIndex);
        assert.isTrue(killIndex > poisonousPulseIndex);

        const poisonousPulse = effects[poisonousPulseIndex];
        if (poisonousPulse?.type !== "TRIGGER") {
            throw new Error("Expected TRIGGER effect");
        }
        assert.equal(poisonousPulse.trigger, "POISONOUS");
        assert.equal(poisonousPulse.cardUuid, MINION_IDS.attacker);
        assert.equal(poisonousPulse.owner, "PLAYER");
    });

    test("poisonous minion deals normal damage to hero", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            minionPowers: { isPoisonous: true },
            effects: ["Toxique"],
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 1);
        assertBoardIndex(assert, game, "playerOne", 0, {
            health: 1,
            attacksThisRound: 1,
        });
    });

    test("hero attack narrative targets opponent hero for player two", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
        });
        const gameData = createGameData({
            isTraining: false,
            state: "PLAYER_TWO_TURN",
            playerTwo: {
                board: placeMinion(
                    createGameData().playerTwo.board,
                    0,
                    createMinionState(attackerCard),
                ),
            },
        });
        const game = createInMemoryGame(gameData);
        const minion = game.data.playerTwo.board[0]!;

        installSocketCollector();
        try {
            await minionToHeroAction({
                minionInfos: {
                    minion,
                    position: { boardIndex: 0, owner: "PLAYER" },
                },
                game,
                player: game.data.playerTwo,
                opponent: game.data.playerOne,
                owner: "OPPONENT",
                socketId: "test-socket",
            });
        } finally {
            restoreSocketCollector();
        }

        const viewerUpdate = getEmittedEvents().find(
            (event) => event.event === "game:update" && event.rooms === "users:2",
        );
        assert.isDefined(viewerUpdate);

        const presentation = (viewerUpdate!.data as SocketEventByKey["game:update"]).presentation;
        assert.isDefined(presentation);

        const attackBeat = presentation!.beats.find((beat) => beat.kind === "ATTACK");
        assert.isDefined(attackBeat);

        const combatDamage = attackBeat!.effects.find((effect) => effect.type === "COMBAT_DAMAGE");
        assert.isDefined(combatDamage);
        if (combatDamage?.type !== "COMBAT_DAMAGE") {
            throw new Error("Expected COMBAT_DAMAGE effect");
        }
        assert.equal(combatDamage.target.type, "HERO");
        assert.equal(combatDamage.target.owner, "OPPONENT");

        const attackLunge = attackBeat!.effects.find((effect) => effect.type === "ATTACK_LUNGE");
        assert.isDefined(attackLunge);
        if (attackLunge?.type !== "ATTACK_LUNGE") {
            throw new Error("Expected ATTACK_LUNGE effect");
        }
        assert.equal(attackLunge.target.owner, "OPPONENT");
    });

    test("charge allows attack on the turn the minion was placed", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
            minionPowers: { hasCharge: true },
            effects: ["Charge"],
        });

        const { game } = await runMinionCombat(
            createGameData({
                currentRound: 3,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard, { placedAtRound: 3 }),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("windfury allows two attacks in the same turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
            minionPowers: { hasWindfury: true },
            effects: ["Furie des vents"],
        });

        const { game: initialGame } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, initialGame, "playerTwo", DEFAULT_HERO_HEALTH - 5);

        const { game: secondGame } = await runMinionCombatOnGame(initialGame, { heroAttack: true });

        assertPlayerHealth(assert, secondGame, "playerTwo", DEFAULT_HERO_HEALTH - 10);
        assertBoardIndex(assert, secondGame, "playerOne", 0, { attacksThisRound: 2 });
    });

    test("charge and windfury allow two attacks on placement turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 2,
            minionPowers: { hasCharge: true, hasWindfury: true },
            effects: ["Charge", "Furie des vents"],
        });

        const { game: initialGame } = await runMinionCombat(
            createGameData({
                currentRound: 2,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard, { placedAtRound: 2 }),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, initialGame, "playerTwo", DEFAULT_HERO_HEALTH - 2);

        const { game: secondGame } = await runMinionCombatOnGame(initialGame, { heroAttack: true });

        assertPlayerHealth(assert, secondGame, "playerTwo", DEFAULT_HERO_HEALTH - 4);
    });

    test("charge and poisonous kills target on placement turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            minionPowers: { hasCharge: true, isPoisonous: true },
            effects: ["Charge", "Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 0,
            health: 9,
        });

        const { game } = await runMinionCombat(
            createGameData({
                currentRound: 4,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard, { placedAtRound: 4 }),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerTwo", 0, null);
        assertBoardIndex(assert, game, "playerOne", 0, {
            health: 1,
            attacksThisRound: 1,
        });
    });

    test("lethal hero attack terminates the game", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: DEFAULT_HERO_HEALTH,
            health: 1,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", 0);
        assertIsFinished(assert, game, true);
    });

    test("taunt blocks hero attack", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
        });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            attack: 1,
            health: 3,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        1,
                        createMinionState(tauntCard),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("allows attacking a taunt minion when taunt is present", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            attack: 1,
            health: 3,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerTwo.board,
                            0,
                            createMinionState(targetCard),
                        ),
                        1,
                        createMinionState(tauntCard),
                    ),
                },
            }),
            { targetIndex: 1 },
        );

        assertBoardIndex(assert, game, "playerTwo", 1, null);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 2 });
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 4 });
    });

    test("attacker dies from counter damage in minion combat", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 3,
            health: 4,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerOne", 0, null);
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 3 });
    });

    test("both minions die in a lethal trade", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 3,
            health: 3,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerOne", 0, null);
        assertBoardIndex(assert, game, "playerTwo", 0, null);
    });

    test("poisonous attacker dies from counter damage but still kills the target", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            minionPowers: { isPoisonous: true },
            effects: ["Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 5,
            health: 5,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerOne", 0, null);
        assertBoardIndex(assert, game, "playerTwo", 0, null);
    });

    test("attacker dies from poisonous counter damage regardless of remaining health", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 10,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            minionPowers: { isPoisonous: true },
            effects: ["Toxique"],
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
        );

        assertBoardIndex(assert, game, "playerOne", 0, null);
        assertBoardIndex(assert, game, "playerTwo", 0, null);
    });

    test("increments attacksThisRound and lastActionAtRound after a successful attack", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 2,
            health: 3,
        });

        const { game } = await runMinionCombat(
            createGameData({
                currentRound: 2,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard, { placedAtRound: 1 }),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertBoardIndex(assert, game, "playerOne", 0, {
            attacksThisRound: 1,
            lastActionAtRound: 2,
        });
    });

    test("non-lethal hero attack damages opponent and leaves the board unchanged", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const boardMinion = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 2,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(boardMinion),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 3 });
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 2 });
    });

    test("windfury rejects a third attack in the same turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 10,
            minionPowers: { hasWindfury: true },
            effects: ["Furie des vents"],
        });

        const initial = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "OPPONENT" },
        );

        const second = await runMinionActionOnGameInMemory(initial.game, "playerOne", {
            minionId: MINION_IDS.attacker,
            minionUuid: null,
            owner: "OPPONENT",
        });

        const third = await runMinionActionOnGameInMemory(second.game, "playerOne", {
            minionId: MINION_IDS.attacker,
            minionUuid: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Ce monstre a déjà attaqué ce tour");
        assertPlayerHealth(assert, third.game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("rejects attack when minion was placed this turn without charge", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                currentRound: 2,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard, { placedAtRound: 2 }),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "OPPONENT" },
        );

        assertError(assert, "Ce monstre n'est pas encore prêt à attaquer");
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects attack when minion has zero attack", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 0,
            health: 4,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                currentRound: 3,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard, { placedAtRound: 1 }),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "OPPONENT" },
        );

        assertError(assert, "Ce monstre ne peut pas attaquer sans points d'attaque");
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects attack when taunt minion is ignored", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            attack: 1,
            health: 3,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerTwo.board,
                            0,
                            createMinionState(targetCard),
                        ),
                        1,
                        createMinionState(tauntCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: MINION_IDS.target, owner: "OPPONENT" },
        );

        assertError(assert, "Vous devez d'abord attaquer un monstre avec Provocation");
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 4 });
        assertBoardIndex(assert, game, "playerTwo", 1, { health: 3 });
    });

    test("rejects attack on own minion", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: MINION_IDS.attacker, owner: "PLAYER" },
        );

        assertError(
            assert,
            "J'aurai pu te laisser attaquer ton propre monstre mais j'ai décidé d'être clément...",
        );
        assertBoardIndex(assert, game, "playerOne", 0, { health: 1 });
    });

    test("rejects action when minion is not on the board", async ({ assert }) => {
        await runMinionActionInMemory(createGameData(), "playerOne", {
            minionId: "nonexistent-minion",
            minionUuid: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Ce monstre n'est pas sur le plateau (gros con)");
    });

    test("rejects attack on an empty opponent spot", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: MINION_IDS.target, owner: "OPPONENT" },
        );

        assertError(assert, "Vous ne pouvez pas jouer ce monstre ici");
        assertBoardIndex(assert, game, "playerOne", 0, { health: 1 });
    });

    test("rejects a second attack without windfury", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 10,
        });

        const initial = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "OPPONENT" },
        );

        const second = await runMinionActionOnGameInMemory(initial.game, "playerOne", {
            minionId: MINION_IDS.attacker,
            minionUuid: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Ce monstre a déjà attaqué ce tour");
        assertPlayerHealth(assert, second.game, "playerTwo", DEFAULT_HERO_HEALTH - 1);
    });

    test("rejects action with opponent minion id on opponent board", async ({ assert }) => {
        const opponentMinion = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 2,
        });

        await runMinionActionInMemory(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(opponentMinion),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.target, minionUuid: MINION_IDS.target, owner: "OPPONENT" },
        );

        assertError(assert, "Ce monstre n'est pas sur le plateau (gros con)");
    });

    test("rejects attacking own hero with owner PLAYER", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "PLAYER" },
        );

        assertError(
            assert,
            "J'aurai pu te laisser attaquer ton propre héros mais j'ai décidé d'être clément...",
        );
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects action when it is not the player turn", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
            }),
            "playerTwo",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "OPPONENT" },
        );

        assertError(assert, "Ce n'est pas votre tour (gros con)");
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects attack on stealth minion", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const stealthCard = createMinionCard({
            uuid: "stealth-minion",
            attack: 1,
            health: 3,
            minionPowers: { hasStealth: true },
            effects: ["Discrétion"],
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(stealthCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: "stealth-minion", owner: "OPPONENT" },
        );

        assertError(assert, "Ce monstre ne peut pas être ciblé");
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 3 });
    });

    test("allows hero attack when only taunt minion has stealth", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const stealthTauntCard = createMinionCard({
            uuid: "stealth-taunt",
            attack: 1,
            health: 3,
            minionPowers: { hasTaunt: true, hasStealth: true },
            effects: ["Provocation", "Discrétion"],
        });

        const { game } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(stealthTauntCard),
                    ),
                },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "OPPONENT" },
        );

        assert.equal(game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 3);
    });

    test("allows attacking stealth minion after it has attacked", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 5,
        });
        const stealthCard = createMinionCard({
            uuid: "stealth-minion",
            attack: 2,
            health: 4,
            minionPowers: { hasStealth: true, hasCharge: true },
            effects: ["Discrétion", "Charge"],
        });

        const data = createGameData({
            currentRound: 2,
            playerOne: {
                board: placeMinion(
                    createGameData().playerOne.board,
                    0,
                    createMinionState(attackerCard, { placedAtRound: 1 }),
                ),
            },
            playerTwo: {
                board: placeMinion(
                    createGameData().playerTwo.board,
                    0,
                    createMinionState(stealthCard, { placedAtRound: 1 }),
                ),
            },
        });

        const { game: gameAfterStealthAttack } = await runMinionActionInMemory(
            { ...data, state: "PLAYER_TWO_TURN" },
            "playerTwo",
            {
                minionId: "stealth-minion",
                minionUuid: null,
                owner: "OPPONENT",
            },
        );

        gameAfterStealthAttack.data.state = "PLAYER_ONE_TURN";

        const { game } = await runMinionActionOnGameInMemory(gameAfterStealthAttack, "playerOne", {
            minionId: MINION_IDS.attacker,
            minionUuid: "stealth-minion",
            owner: "OPPONENT",
        });

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 1 });
    });

    test("requires attacking taunt minion after stealth-taunt loses stealth", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 5,
        });
        const stealthTauntCard = createMinionCard({
            uuid: "stealth-taunt",
            attack: 1,
            health: 4,
            minionPowers: { hasTaunt: true, hasStealth: true, hasCharge: true },
            effects: ["Provocation", "Discrétion", "Charge"],
        });

        const data = createGameData({
            currentRound: 2,
            playerOne: {
                board: placeMinion(
                    createGameData().playerOne.board,
                    0,
                    createMinionState(attackerCard, { placedAtRound: 1 }),
                ),
            },
            playerTwo: {
                board: placeMinion(
                    createGameData().playerTwo.board,
                    0,
                    createMinionState(stealthTauntCard, { placedAtRound: 1 }),
                ),
            },
        });

        const { game: gameAfterStealthAttack } = await runMinionActionInMemory(
            { ...data, state: "PLAYER_TWO_TURN" },
            "playerTwo",
            {
                minionId: "stealth-taunt",
                minionUuid: null,
                owner: "OPPONENT",
            },
        );

        const spot1Card = gameAfterStealthAttack.data.playerTwo.board[0]!.originalCard;

        assert.isFalse((spot1Card as MinionCard).minionPowers!.hasStealth);
        assertPlayerHealth(assert, gameAfterStealthAttack, "playerOne", DEFAULT_HERO_HEALTH - 1);

        gameAfterStealthAttack.data.state = "PLAYER_ONE_TURN";

        const { game: gameAfterRejectedHero } = await runMinionActionOnGameInMemory(
            gameAfterStealthAttack,
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: null, owner: "OPPONENT" },
        );

        assertError(assert, "Vous devez d'abord attaquer un monstre avec Provocation");
        assertPlayerHealth(assert, gameAfterRejectedHero, "playerTwo", DEFAULT_HERO_HEALTH);

        const { game } = await runMinionActionOnGameInMemory(gameAfterRejectedHero, "playerOne", {
            minionId: MINION_IDS.attacker,
            minionUuid: "stealth-taunt",
            owner: "OPPONENT",
        });

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 1 });
    });

    test("allows attacking visible minion or hero when taunt minion has stealth", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const secondAttackerCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 3,
        });
        const visibleCard = createMinionCard({
            uuid: "visible-minion",
            attack: 1,
            health: 4,
        });
        const stealthTauntCard = createMinionCard({
            uuid: "stealth-taunt",
            attack: 1,
            health: 3,
            minionPowers: { hasTaunt: true, hasStealth: true },
            effects: ["Provocation", "Discrétion"],
        });

        const baseBoard = createGameData().playerTwo.board;
        const opponentBoard = placeMinion(
            placeMinion(baseBoard, 0, createMinionState(visibleCard)),
            1,
            createMinionState(stealthTauntCard),
        );

        const { game: gameAfterMinionAttack } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerOne.board,
                            0,
                            createMinionState(attackerCard),
                        ),
                        1,
                        createMinionState(secondAttackerCard),
                    ),
                },
                playerTwo: { board: opponentBoard },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: "visible-minion", owner: "OPPONENT" },
        );

        assertBoardIndex(assert, gameAfterMinionAttack, "playerTwo", 0, { health: 1 });

        const { game: gameAfterHeroAttack } = await runMinionActionOnGameInMemory(
            gameAfterMinionAttack,
            "playerOne",
            { minionId: MINION_IDS.target, minionUuid: null, owner: "OPPONENT" },
        );

        assert.equal(gameAfterHeroAttack.data.playerTwo.health, DEFAULT_HERO_HEALTH - 2);

        const { game: gameAfterStealthReject } = await runMinionActionInMemory(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: { board: opponentBoard },
            }),
            "playerOne",
            { minionId: MINION_IDS.attacker, minionUuid: "stealth-taunt", owner: "OPPONENT" },
        );

        assertError(assert, "Ce monstre ne peut pas être ciblé");
        assertBoardIndex(assert, gameAfterStealthReject, "playerTwo", 1, { health: 3 });
    });
});
