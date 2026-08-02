import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import type { GameData } from "#api_types/game.types";
import Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { EXPERT_AI_DEFAULTS } from "#galaguerre/ai/advanced/expert_ai_config";
import { decideExpertMoves } from "#galaguerre/ai/advanced/decide_expert_move";
import { decideNextMoves } from "#galaguerre/ai/advanced/decide_next_move";
import { ADVANCED_AI_DEFAULTS } from "#galaguerre/ai/advanced/advanced_ai_config";
import { selectMulliganCardUuids } from "#galaguerre/ai/advanced/advanced_mulligan";
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

const HUMAN_USER_ID = 1;

/**
 * Budget serré mais suffisant : la recherche de réplique est la dernière servie, un budget trop
 * court la couperait et le test mesurerait alors le comportement de l'IA Avancée.
 */
const TEST_CONFIG = {
    ...EXPERT_AI_DEFAULTS,
    maxThinkMs: 3000,
    minThinkMs: 1500,
};

const decideExpert = (data: GameData, seed: number) =>
    decideExpertMoves(data, {
        aiUserId: TRAINING_AI_USER_ID,
        opponentUserId: HUMAN_USER_ID,
        profile: "MIDRANGE",
        config: TEST_CONFIG,
        seed,
    });

/** Installe un état comme partie d'entraînement Expert dont l'IA occupe le siège `playerTwo`. */
const createExpertTrainingGame = async (data: GameData) => {
    const { game } = await createTestGame(data);

    await game
        .merge({
            data: {
                ...bindUserIds(game.data, game.data.playerOne.userId, TRAINING_AI_USER_ID),
                isTraining: true,
                aiDifficulty: "EXPERT",
            },
            playerTwoId: null,
        })
        .save();

    return game;
};

const readyMinion = (uuid: string, attack: number, health: number) =>
    createMinionState(createMinionCard({ uuid, attack, health }), {
        placedAtRound: 0,
        lastActionAtRound: 0,
        attacksThisRound: 0,
    });

/**
 * L'IA est à 4 PV face à un 5/5 prêt à frapper : si elle envoie son propre 5/5 au visage, elle
 * meurt au tour suivant. Le score STATIQUE préfère pourtant le visage (l'échange est neutre au
 * plateau, les dégâts au héros sont un gain net) — c'est exactement l'angle mort que la recherche
 * de réplique doit combler.
 */
const createRaceOrTradeState = (): GameData =>
    bindUserIds(
        createGameData({
            state: "PLAYER_TWO_TURN",
            currentRound: 5,
            isTraining: true,
            playerOne: {
                health: 30,
                board: [readyMinion("enemy", 5, 5)],
                hand: [],
                deckCards: [createMinionCard({ uuid: "enemy-deck", cost: 1 })],
            },
            playerTwo: {
                health: 4,
                mana: 0,
                hand: [],
                board: [readyMinion("ai", 5, 5)],
            },
        }),
        HUMAN_USER_ID,
        TRAINING_AI_USER_ID,
    );

const firstMoveTarget = (moves: Awaited<ReturnType<typeof decideExpert>>["moves"]) => {
    const move = moves[0];
    if (!move || move.type !== "minion_action") return undefined;

    return move.action.minionUuid;
};

test.group("ai:expert", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());
    group.each.setup(() => {
        setAiActionDelayForTests(0);
    });

    test("trades instead of racing when going face would hand over lethal", async ({ assert }) => {
        const decision = await decideExpert(createRaceOrTradeState(), 1);

        assert.equal(
            firstMoveTarget(decision.moves),
            "enemy",
            "expected the expert AI to remove the threat rather than go face",
        );
    });

    test("the advanced AI takes the losing race on the same board", async ({ assert }) => {
        // Contre-épreuve : sans le pli supplémentaire, la même position se joue au visage.
        // C'est ce qui prouve que le test précédent mesure bien la recherche de réplique.
        const decision = await decideNextMoves(createRaceOrTradeState(), {
            aiUserId: TRAINING_AI_USER_ID,
            profile: "MIDRANGE",
            config: { ...ADVANCED_AI_DEFAULTS, maxThinkMs: 800, minThinkMs: 50 },
            seed: 1,
        });

        assert.isNull(firstMoveTarget(decision.moves) ?? null);
    });

    test("still finds a lethal line and takes it", async ({ assert }) => {
        const data = bindUserIds(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 5,
                isTraining: true,
                playerOne: { health: 8, board: [readyMinion("bait", 1, 5)] },
                playerTwo: {
                    mana: 0,
                    hand: [],
                    board: [readyMinion("att-a", 5, 5), readyMinion("att-b", 5, 5)],
                },
            }),
            HUMAN_USER_ID,
            TRAINING_AI_USER_ID,
        );

        const decision = await decideExpert(data, 2);
        assert.isTrue(decision.isLethal, "expected the expert AI to find a lethal sequence");

        let state = data;
        for (const move of decision.moves) {
            state = (await applyAiMove(state, TRAINING_AI_USER_ID, move)).data;
        }

        assert.isAtMost(state.playerOne.health, 0);
    });

    test("the simulation context is closed once the decision is made", async ({ assert }) => {
        const data = bindUserIds(
            createGameData({ state: "PLAYER_TWO_TURN", currentRound: 2, isTraining: true }),
            HUMAN_USER_ID,
            TRAINING_AI_USER_ID,
        );

        assert.isFalse(isSimulating());
        await decideExpert(data, 3);
        assert.isFalse(isSimulating(), "the simulation context must not leak outside the search");
    });

    test("runAdvancedAiTurn in EXPERT mode plays and hands the turn back", async ({ assert }) => {
        const game = await createExpertTrainingGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 4,
                playerTwo: {
                    mana: 4,
                    hand: [
                        createMinionCard({ uuid: "exp-1", cost: 2, attack: 2, health: 3 }),
                        createMinionCard({ uuid: "exp-2", cost: 2, attack: 3, health: 2 }),
                    ],
                    board: createEmptyBoard(),
                },
            }),
        );

        await runAdvancedAiTurn(game.id, TRAINING_AI_USER_ID, "EXPERT");
        await game.refresh();

        const played = await Game.findOrFail(game.id);
        assert.equal(played.data.state, "PLAYER_ONE_TURN");
        assert.isAbove(played.data.playerTwo.board.length, 0, "expected the AI to have played");
    });
});

test.group("ai:expert:mulligan", () => {
    test("keeps a lower curve against a fast opponent deck", ({ assert }) => {
        const hand = [
            createMinionCard({ uuid: "c1", cost: 1 }),
            createMinionCard({ uuid: "c4", cost: 4 }),
        ];

        const player = createGamePlayer(TRAINING_AI_USER_ID, { hand });
        const fastOpponent = createGamePlayer(HUMAN_USER_ID, {
            deckCards: Array.from({ length: 10 }, (_, index) =>
                createMinionCard({ uuid: `fast-${index}`, cost: 1 }),
            ),
        });

        // Sans information sur l'adversaire, le mid-range garde une carte à 4.
        assert.notInclude(selectMulliganCardUuids(player, "MIDRANGE"), "c4");
        // En la voyant venir, l'Expert la rejette pour tenir le rythme.
        assert.include(
            selectMulliganCardUuids(player, "MIDRANGE", { opponent: fastOpponent }),
            "c4",
        );
    });

    test("keeps a higher curve against a slow opponent deck", ({ assert }) => {
        const hand = [createMinionCard({ uuid: "c5", cost: 5 })];

        const player = createGamePlayer(TRAINING_AI_USER_ID, { hand });
        const slowOpponent = createGamePlayer(HUMAN_USER_ID, {
            deckCards: Array.from({ length: 10 }, (_, index) =>
                createMinionCard({ uuid: `slow-${index}`, cost: 6 }),
            ),
        });

        assert.include(selectMulliganCardUuids(player, "MIDRANGE"), "c5");
        assert.notInclude(
            selectMulliganCardUuids(player, "MIDRANGE", { opponent: slowOpponent }),
            "c5",
        );
    });
});
