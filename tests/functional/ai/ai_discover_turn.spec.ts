import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import type { AiDifficulty, GameData } from "#api_types/game.types";
import { runAdvancedAiTurn } from "#galaguerre/ai/advanced/run_advanced_ai_turn";
import { setAiActionDelayForTests } from "#galaguerre/ai/ai_action_delay";
import type Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createSpellCard,
} from "#tests/helpers/game/fixtures";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";

const createTrainingGame = async (data: GameData, aiDifficulty: AiDifficulty = "ADVANCED") => {
    const { game } = await createTestGame(data);

    await game
        .merge({
            data: {
                ...bindUserIds(game.data, game.data.playerOne.userId, TRAINING_AI_USER_ID),
                isTraining: true,
                aiDifficulty,
            },
            playerTwoId: null,
        })
        .save();

    return game;
};

const discoverAction = () =>
    createCardActionSnapshot({
        type: "DISCOVER",
        discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
        optionCount: 3,
    });

/** Zoothérapie (#153) : deux découvertes enchaînées sur la même carte. */
const createDoubleDiscoverSpell = () =>
    createSpellCard({
        uuid: "double-discover-spell",
        cardId: 153,
        label: "Zoothérapie",
        cost: 3,
        spellActions: [discoverAction(), discoverAction()],
    });

const createSingleDiscoverSpell = () =>
    createSpellCard({
        uuid: "single-discover-spell",
        cardId: 152,
        label: "Découverte simple",
        cost: 3,
        spellActions: [discoverAction()],
    });

const waitForIdle = async (game: Game, ms = 3000) => {
    const deadline = Date.now() + ms;

    while (Date.now() < deadline) {
        await game.refresh();
        if (!game.data.pendingDiscover) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    await game.refresh();
};

test.group("ai:discover", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());
    group.each.setup(() => {
        setAiActionDelayForTests(0);
    });

    test("resolves a single discover and hands the turn back", async ({ assert }) => {
        const game = await createTrainingGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 3,
                playerTwo: {
                    mana: 3,
                    hand: [createSingleDiscoverSpell()],
                    board: createEmptyBoard(),
                },
            }),
        );

        await runAdvancedAiTurn(game.id, TRAINING_AI_USER_ID);
        await waitForIdle(game);

        assert.isUndefined(game.data.pendingDiscover, "the discover must not stay pending");
        assert.equal(game.data.state, "PLAYER_ONE_TURN", "the AI must pass the turn");
    });

    test("resolves both discovers of Zoothérapie and hands the turn back", async ({ assert }) => {
        const game = await createTrainingGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 3,
                playerTwo: {
                    mana: 3,
                    hand: [createDoubleDiscoverSpell(), createMinionCard({ uuid: "m", cost: 1 })],
                    board: createEmptyBoard(),
                },
            }),
        );

        await runAdvancedAiTurn(game.id, TRAINING_AI_USER_ID);
        await waitForIdle(game);

        assert.isUndefined(game.data.pendingDiscover, "the second discover must not stay pending");
        assert.equal(game.data.state, "PLAYER_ONE_TURN", "the AI must pass the turn");
    });

    test("Ultron resolves both discovers of Zoothérapie and hands the turn back", async ({
        assert,
    }) => {
        const game = await createTrainingGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 3,
                playerTwo: {
                    mana: 3,
                    hand: [createDoubleDiscoverSpell()],
                    board: createEmptyBoard(),
                },
            }),
            "EXPERT",
        );

        await runAdvancedAiTurn(game.id, TRAINING_AI_USER_ID, "EXPERT");
        await waitForIdle(game);

        assert.isUndefined(game.data.pendingDiscover, "the second discover must not stay pending");
        assert.equal(game.data.state, "PLAYER_ONE_TURN", "the AI must pass the turn");
    });
});
