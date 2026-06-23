import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { showGameReplay } from "#controllers/game_history/show_game_replay";
import { REPLAY_FORMAT_VERSION } from "#api_types/game_replay.types";
import {
    flushReplayToDatabase,
    getActiveReplayBuffer,
} from "#galaguerre/game_replay/game_replay_buffer";
import GameReplay from "#models/game_replay";
import { createGameData, createMinionCard, CARD_IDS } from "#tests/helpers/game/fixtures";
import { runPlayCard } from "#tests/helpers/game/run_play_card";
import { runPassTurnOnGame } from "#tests/helpers/game/run_pass_turn";
import { createOutsiderUser } from "#tests/helpers/game/game_factory";
import type { HttpContext } from "@adonisjs/core/http";

const createMockContext = (params: Record<string, unknown>) => {
    let notFoundBody: unknown;

    const ctx = {
        params,
        response: {
            notFound: (body: unknown) => {
                notFoundBody = body;
                return body;
            },
        },
    } as unknown as HttpContext;

    return { ctx, getNotFoundBody: () => notFoundBody };
};

test.group("record replay", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("records presentation steps when actions are played", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            label: "Gobelin test",
            cost: 3,
        });

        const playResult = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        const buffer = getActiveReplayBuffer(playResult.game.id);
        assert.isDefined(buffer);
        assert.equal(buffer!.version, REPLAY_FORMAT_VERSION);
        assert.equal(buffer!.steps.length, 1);
        assert.isAbove(buffer!.steps[0]!.beats.length, 0);

        const passResult = await runPassTurnOnGame(playResult.game, playResult.actorUserId);

        assert.equal(getActiveReplayBuffer(passResult.game.id)!.steps.length, 3);

        await flushReplayToDatabase(passResult.game);
        const record = await GameReplay.findBy("gameId", passResult.game.id);
        assert.isNotNull(record);
        assert.equal(record!.data.steps.length, 3);
    });
});

test.group("game replay api", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("returns replay data for finished game with recorded steps", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 3,
        });

        const playResult = await runPlayCard({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        const game = playResult.game;
        await flushReplayToDatabase(game);
        game.isFinished = true;
        await game.save();

        const { ctx } = createMockContext({
            userId: playResult.game.data.playerOne.userId,
            gameId: game.id,
        });

        const result = await showGameReplay(ctx);

        assert.equal(result.gameId, game.id);
        assert.equal(result.replay.steps.length, 1);
        assert.equal(result.playerOne.userId, game.data.playerOne.userId);
        assert.equal(result.playerTwo.userId, game.data.playerTwo.userId);
    });

    test("returns 404 when replay is unavailable", async ({ assert }) => {
        const playResult = await runPlayCard({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    mana: 5,
                    hand: [
                        createMinionCard({
                            uuid: CARD_IDS.handMinion,
                            cost: 3,
                        }),
                    ],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        const game = playResult.game;
        game.isFinished = true;
        await game.save();

        const { ctx, getNotFoundBody } = createMockContext({
            userId: game.data.playerOne.userId,
            gameId: game.id,
        });

        await showGameReplay(ctx);

        assert.deepEqual(getNotFoundBody(), {
            error: "Replay indisponible pour cette partie",
        });
    });

    test("returns 404 for non-participant", async ({ assert }) => {
        const playResult = await runPlayCard({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    mana: 5,
                    hand: [
                        createMinionCard({
                            uuid: CARD_IDS.handMinion,
                            cost: 3,
                        }),
                    ],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        const game = playResult.game;
        await flushReplayToDatabase(game);
        game.isFinished = true;
        await game.save();

        const outsider = await createOutsiderUser();

        const { ctx, getNotFoundBody } = createMockContext({
            userId: outsider.id,
            gameId: game.id,
        });

        await showGameReplay(ctx);

        assert.deepEqual(getNotFoundBody(), { error: "Partie introuvable" });
    });
});
