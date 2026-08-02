import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import db from "@adonisjs/lucid/services/db";
import type { GameData } from "#api_types/game.types";
import Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { selectMulliganCardUuids } from "#galaguerre/ai/advanced/advanced_mulligan";
import { ADVANCED_AI_DEFAULTS } from "#galaguerre/ai/advanced/advanced_ai_config";
import { decideNextMoves } from "#galaguerre/ai/advanced/decide_next_move";
import { runAdvancedAiTurn } from "#galaguerre/ai/advanced/run_advanced_ai_turn";
import { setAiActionDelayForTests } from "#galaguerre/ai/ai_action_delay";
import { applyAiMove } from "#galaguerre/simulation/apply_ai_move";
import { isSimulating } from "../../../app/utils/simulation_context.js";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import {
    createEmptyBoard,
    createGameData,
    createGamePlayer,
    createMinionCard,
    createMinionState,
} from "#tests/helpers/game/fixtures";

const TEST_CONFIG = {
    ...ADVANCED_AI_DEFAULTS,
    // Budget serré : les tests doivent rester rapides, la recherche doit rendre un coup quand même.
    maxThinkMs: 800,
    minThinkMs: 50,
};

/** Installe un état comme partie d'entraînement dont l'IA occupe le siège `playerTwo`. */
const createAdvancedTrainingGame = async (data: GameData) => {
    const { game } = await createTestGame(data);

    await game
        .merge({
            data: {
                ...bindUserIds(game.data, game.data.playerOne.userId, TRAINING_AI_USER_ID),
                isTraining: true,
                aiDifficulty: "ADVANCED",
            },
            playerTwoId: null,
        })
        .save();

    return game;
};

test.group("ai:advanced", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());
    group.each.setup(() => {
        setAiActionDelayForTests(0);
    });

    test("finds a lethal line instead of trading", async ({ assert }) => {
        // Deux 5/5 prêts à attaquer, adversaire à 8 PV et sans Provocation : la seule bonne
        // réponse est de frapper deux fois au visage. Un appât juteux est posé en face pour que
        // l'échange soit tentant.
        const attackerA = createMinionState(
            createMinionCard({ uuid: "att-a", attack: 5, health: 5 }),
            { placedAtRound: 0, lastActionAtRound: 0, attacksThisRound: 0 },
        );
        const attackerB = createMinionState(
            createMinionCard({ uuid: "att-b", attack: 5, health: 5 }),
            { placedAtRound: 0, lastActionAtRound: 0, attacksThisRound: 0 },
        );
        const bait = createMinionState(createMinionCard({ uuid: "bait", attack: 1, health: 5 }));

        const data = createGameData({
            state: "PLAYER_TWO_TURN",
            currentRound: 5,
            isTraining: true,
            playerOne: { health: 8, board: [bait] },
            playerTwo: { mana: 0, hand: [], board: [attackerA, attackerB] },
        });

        const boundData = bindUserIds(data, 1, TRAINING_AI_USER_ID);

        const decision = await decideNextMoves(boundData, {
            aiUserId: TRAINING_AI_USER_ID,
            profile: "MIDRANGE",
            config: TEST_CONFIG,
            seed: 1,
        });

        assert.isTrue(decision.isLethal, "expected the AI to find a lethal sequence");

        // On rejoue la séquence : l'adversaire doit finir à 0 PV ou moins.
        let state = boundData;
        for (const move of decision.moves) {
            const result = await applyAiMove(state, TRAINING_AI_USER_ID, move);
            state = result.data;
        }

        assert.isAtMost(state.playerOne.health, 0);
    });

    test("attacks the taunt first when it blocks the way", async ({ assert }) => {
        const attacker = createMinionState(createMinionCard({ uuid: "att", attack: 4, health: 4 }));
        const taunt = createMinionState(
            createMinionCard({
                uuid: "taunt",
                attack: 1,
                health: 2,
                minionPowers: {
                    hasTaunt: true,
                    hasCharge: false,
                    hasRush: false,
                    hasWindfury: false,
                    isPoisonous: false,
                    hasStealth: false,
                    hasDivineShield: false,
                },
            }),
        );

        const data = bindUserIds(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 5,
                isTraining: true,
                playerOne: { health: 30, board: [taunt] },
                playerTwo: { mana: 0, hand: [], board: [attacker] },
            }),
            1,
            TRAINING_AI_USER_ID,
        );

        const decision = await decideNextMoves(data, {
            aiUserId: TRAINING_AI_USER_ID,
            profile: "MIDRANGE",
            config: TEST_CONFIG,
            seed: 2,
        });

        const firstMove = decision.moves[0];
        assert.isDefined(firstMove);
        assert.equal(firstMove!.type, "minion_action");
        assert.equal(
            (firstMove as { action: { minionUuid: string | null } }).action.minionUuid,
            "taunt",
        );
    });

    test("spends its mana instead of passing with a full hand", async ({ assert }) => {
        const data = bindUserIds(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 4,
                isTraining: true,
                playerTwo: {
                    mana: 4,
                    board: createEmptyBoard(),
                    hand: [
                        createMinionCard({ uuid: "h1", cost: 2, attack: 2, health: 3 }),
                        createMinionCard({ uuid: "h2", cost: 2, attack: 3, health: 2 }),
                    ],
                },
            }),
            1,
            TRAINING_AI_USER_ID,
        );

        const decision = await decideNextMoves(data, {
            aiUserId: TRAINING_AI_USER_ID,
            profile: "MIDRANGE",
            config: TEST_CONFIG,
            seed: 3,
        });

        const playedCards = decision.moves.filter((move) => move.type === "play_card");
        assert.equal(playedCards.length, 2, "expected the AI to play both 2-mana minions");
    });

    test("simulation never writes to the database", async ({ assert }) => {
        const attacker = createMinionState(
            createMinionCard({ uuid: "sim-att", attack: 10, health: 10 }),
        );

        // État à un coup de la victoire : la simulation va donc traverser `terminateGame`,
        // c'est précisément le chemin qui écrivait en base sans le garde de simulation.
        const game = await createAdvancedTrainingGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 5,
                playerOne: { health: 3, board: [] },
                playerTwo: { mana: 0, hand: [], board: [attacker] },
            }),
        );

        const before = await db.from("games").where("id", game.id).firstOrFail();

        await decideNextMoves(game.data, {
            aiUserId: TRAINING_AI_USER_ID,
            profile: "MIDRANGE",
            config: TEST_CONFIG,
            seed: 4,
        });

        const after = await db.from("games").where("id", game.id).firstOrFail();

        assert.isFalse(after.is_finished, "the real game must not be marked finished");
        assert.deepEqual(after.data, before.data, "the persisted game data must be untouched");
        assert.isNull(after.ended_at);
    });

    test("the simulation context is closed once the decision is made", async ({ assert }) => {
        const data = bindUserIds(
            createGameData({ state: "PLAYER_TWO_TURN", currentRound: 2, isTraining: true }),
            1,
            TRAINING_AI_USER_ID,
        );

        assert.isFalse(isSimulating());

        await decideNextMoves(data, {
            aiUserId: TRAINING_AI_USER_ID,
            profile: "AGGRO",
            config: TEST_CONFIG,
            seed: 5,
        });

        assert.isFalse(isSimulating(), "the simulation context must not leak outside the search");
    });

    test("runAdvancedAiTurn plays and hands the turn back", async ({ assert }) => {
        const game = await createAdvancedTrainingGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                playerTwo: {
                    mana: 2,
                    hand: [createMinionCard({ uuid: "adv-hand-card", cost: 1 })],
                    board: createEmptyBoard(),
                },
            }),
        );

        await runAdvancedAiTurn(game.id, TRAINING_AI_USER_ID);
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_ONE_TURN");
    });

    test("runAdvancedAiTurn develops its board instead of idling", async ({ assert }) => {
        const game = await createAdvancedTrainingGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 4,
                playerTwo: {
                    mana: 4,
                    hand: [
                        createMinionCard({ uuid: "dev-1", cost: 2, attack: 2, health: 3 }),
                        createMinionCard({ uuid: "dev-2", cost: 2, attack: 3, health: 2 }),
                    ],
                    board: createEmptyBoard(),
                },
            }),
        );

        await runAdvancedAiTurn(game.id, TRAINING_AI_USER_ID);
        await game.refresh();

        const aiSeat = await Game.findOrFail(game.id);
        assert.isAbove(
            aiSeat.data.playerTwo.board.length,
            0,
            "expected the AI to have played minions",
        );
    });
});

test.group("ai:advanced:mulligan", () => {
    test("throws away cards it cannot play early", ({ assert }) => {
        const player = createGamePlayer(TRAINING_AI_USER_ID, {
            hand: [
                createMinionCard({ uuid: "cheap-1", cost: 1 }),
                createMinionCard({ uuid: "cheap-2", cost: 2 }),
                createMinionCard({ uuid: "expensive-1", cost: 7 }),
                createMinionCard({ uuid: "expensive-2", cost: 8 }),
            ],
        });

        const tossed = selectMulliganCardUuids(player, "MIDRANGE");

        assert.includeMembers(tossed, ["expensive-1", "expensive-2"]);
        assert.notInclude(tossed, "cheap-1");
        assert.notInclude(tossed, "cheap-2");
    });

    test("aggro keeps a lower curve than midrange", ({ assert }) => {
        const hand = [
            createMinionCard({ uuid: "c1", cost: 1 }),
            createMinionCard({ uuid: "c4", cost: 4 }),
        ];

        const aggroTossed = selectMulliganCardUuids(
            createGamePlayer(TRAINING_AI_USER_ID, { hand }),
            "AGGRO",
        );
        const midrangeTossed = selectMulliganCardUuids(
            createGamePlayer(TRAINING_AI_USER_ID, { hand }),
            "MIDRANGE",
        );

        assert.include(aggroTossed, "c4");
        assert.notInclude(midrangeTossed, "c4");
    });

    test("keeps a hand that is entirely cheap", ({ assert }) => {
        const player = createGamePlayer(TRAINING_AI_USER_ID, {
            hand: [
                createMinionCard({ uuid: "a", cost: 1 }),
                createMinionCard({ uuid: "b", cost: 1 }),
                createMinionCard({ uuid: "c", cost: 2 }),
            ],
        });

        assert.deepEqual(selectMulliganCardUuids(player, "AGGRO"), []);
    });
});
