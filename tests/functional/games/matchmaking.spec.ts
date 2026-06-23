import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { me } from "#controllers/auth/me";
import { cancelGameSearch } from "#controllers/games/cancel_game_search";
import { createTrainingGame } from "#controllers/games/create_training_game";
import { gameSearch } from "#controllers/games/game_search";
import { gameSearchHeartbeat } from "#controllers/games/game_search_heartbeat";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Game from "#models/game";
import User from "#models/user";
import { syncCards } from "#database/seed_helpers/sync_cards";
import {
    MATCHMAKING_QUEUE,
    MATCHMAKING_TTL_MS,
    addMatchmakingQueueItem,
    findQueueItemByUserId,
} from "#services/sockets/matchmaking";
import { defaultMinionData } from "#database/seed_data/cards/define_card";
import { getActiveCardSetId } from "#tests/helpers/card_set";
import { bindUserIds, createTestUsers } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

const expectResult = <T>(value: T | void): T => {
    if (value === undefined) {
        throw new Error("Expected controller result");
    }

    return value;
};

const createMockContext = (user: User, body: Record<string, unknown> = {}) => {
    let badRequestBody: unknown;
    let notFoundBody: unknown;

    const ctx = {
        auth: { user },
        request: {
            body: () => body,
        },
        response: {
            badRequest: (payload: unknown) => {
                badRequestBody = payload;
                return payload;
            },
            notFound: (payload: unknown) => {
                notFoundBody = payload;
                return payload;
            },
        },
    } as unknown as HttpContext;

    return {
        ctx,
        getBadRequestBody: () => badRequestBody,
        getNotFoundBody: () => notFoundBody,
    };
};

const createValidDeckForUser = async (userId: number, labelPrefix: string) => {
    const deck = await Deck.create({
        name: `Matchmaking deck ${labelPrefix}`,
        userId,
        selected: true,
    });

    for (let index = 0; index < 15; index++) {
        const card = await Card.create({
            cardSetId: await getActiveCardSetId(),
            data: parseMinionData({
                ...defaultMinionData(),
                name: `${labelPrefix}-card-${index}`,
            }),
            isCollectible: true,
        });

        await DeckCard.create({
            deckId: deck.id,
            cardId: card.id,
        });
        await DeckCard.create({
            deckId: deck.id,
            cardId: card.id,
        });
    }

    await deck.load("cards", (query) => query.preload("cardSet"));

    return deck;
};

const createUser = async (suffix: string) =>
    User.create({
        email: `mm-${suffix}-${Date.now()}@test.fr`,
        password: "test",
        pseudo: `player-${suffix}`,
    });

test.group("matchmaking api", (group) => {
    group.each.setup(() => {
        MATCHMAKING_QUEUE.length = 0;
        return testUtils.db().wrapInGlobalTransaction();
    });

    test("gameSearch returns a search session when queue is empty", async ({ assert }) => {
        const user = await createUser("search");
        await createValidDeckForUser(user.id, "search");

        const { ctx } = createMockContext(user);
        const result = expectResult(await gameSearch(ctx));
        assert.equal(result.message, "Waiting for an opponent to join...");
        assert.isString(result.searchSessionId);
        assert.equal(MATCHMAKING_QUEUE.length, 1);
        assert.equal(MATCHMAKING_QUEUE[0]!.userId, user.id);
    });

    test("duplicate gameSearch returns the same session", async ({ assert }) => {
        const user = await createUser("dedup");
        await createValidDeckForUser(user.id, "dedup");

        const { ctx } = createMockContext(user);
        const first = expectResult(await gameSearch(ctx));
        const second = expectResult(await gameSearch(ctx));

        assert.equal(first.searchSessionId, second.searchSessionId);
        assert.equal(MATCHMAKING_QUEUE.length, 1);
    });

    test("me exposes the active matchmaking session", async ({ assert }) => {
        const user = await createUser("me");
        const sessionId = addMatchmakingQueueItem(user.id);

        const { ctx } = createMockContext(user);
        const result = expectResult(await me(ctx));

        assert.equal(result.matchmakingSearchSessionId, sessionId);
    });

    test("cancelGameSearch removes the session", async ({ assert }) => {
        const user = await createUser("cancel");
        const sessionId = addMatchmakingQueueItem(user.id);

        const { ctx } = createMockContext(user, { searchSessionId: sessionId });
        const result = expectResult(await cancelGameSearch(ctx));

        assert.equal(result.message, "Search cancelled");
        assert.equal(MATCHMAKING_QUEUE.length, 0);

        const { ctx: missingCtx, getNotFoundBody } = createMockContext(user, {
            searchSessionId: "missing-session",
        });
        await cancelGameSearch(missingCtx);
        assert.isDefined(getNotFoundBody());
    });

    test("heartbeat returns searching while session is active", async ({ assert }) => {
        const user = await createUser("heartbeat");
        const sessionId = addMatchmakingQueueItem(user.id);

        const { ctx } = createMockContext(user, { searchSessionId: sessionId });
        const result = expectResult(await gameSearchHeartbeat(ctx));

        assert.equal(result.status, "searching");
    });

    test("heartbeat returns idle for expired sessions", async ({ assert }) => {
        const user = await createUser("expired");
        const sessionId = addMatchmakingQueueItem(user.id);
        MATCHMAKING_QUEUE[0]!.lastHeartbeatAt = Date.now() - MATCHMAKING_TTL_MS - 1;

        const { ctx } = createMockContext(user, { searchSessionId: sessionId });
        const result = expectResult(await gameSearchHeartbeat(ctx));

        assert.equal(result.status, "idle");
    });

    test("heartbeat returns matched when user has an active game", async ({ assert }) => {
        const { playerOne, playerTwo } = await createTestUsers();
        const sessionId = addMatchmakingQueueItem(playerOne.id);

        const game = await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data: bindUserIds(createGameData({ state: "MULLIGAN" }), playerOne.id, playerTwo.id),
            isFinished: false,
        });

        const { ctx } = createMockContext(playerOne, { searchSessionId: sessionId });
        const result = expectResult(await gameSearchHeartbeat(ctx));

        assert.equal(result.status, "matched");
        if (result.status !== "matched") {
            throw new Error("Expected matched heartbeat status");
        }
        assert.equal(result.gameId, game.id);
    });

    test("two players create a game and clear the queue", async ({ assert }) => {
        const playerOne = await createUser("p1");
        const playerTwo = await createUser("p2");
        await createValidDeckForUser(playerOne.id, "p1");
        await createValidDeckForUser(playerTwo.id, "p2");

        const first = expectResult(await gameSearch(createMockContext(playerOne).ctx));
        assert.isString(first.searchSessionId);
        assert.equal(MATCHMAKING_QUEUE.length, 1);

        const second = expectResult(await gameSearch(createMockContext(playerTwo).ctx));
        assert.equal(second.message, "Game created");
        assert.equal(MATCHMAKING_QUEUE.length, 0);

        const activeGame = await Game.query()
            .where((query) =>
                query.where("playerOneId", playerOne.id).orWhere("playerTwoId", playerOne.id),
            )
            .andWhere("isFinished", false)
            .first();

        assert.isNotNull(activeGame);
    });

    test("expired opponent is skipped and joiner stays queued", async ({ assert }) => {
        const waitingPlayer = await createUser("ghost");
        const joiner = await createUser("joiner");
        await createValidDeckForUser(joiner.id, "joiner");

        const ghostSessionId = addMatchmakingQueueItem(waitingPlayer.id);
        MATCHMAKING_QUEUE[0]!.lastHeartbeatAt = Date.now() - MATCHMAKING_TTL_MS - 1;

        const result = expectResult(await gameSearch(createMockContext(joiner).ctx));

        assert.equal(result.message, "Waiting for an opponent to join...");
        assert.isString(result.searchSessionId);
        assert.equal(MATCHMAKING_QUEUE.length, 1);
        assert.equal(MATCHMAKING_QUEUE[0]!.userId, joiner.id);
        assert.notEqual(MATCHMAKING_QUEUE[0]!.searchSessionId, ghostSessionId);
    });

    test("gameSearch rejects users who already have an active game", async ({ assert }) => {
        const { playerOne, playerTwo } = await createTestUsers();
        await createValidDeckForUser(playerOne.id, "busy");

        await Game.create({
            playerOneId: playerOne.id,
            playerTwoId: playerTwo.id,
            data: bindUserIds(createGameData({ state: "MULLIGAN" }), playerOne.id, playerTwo.id),
            isFinished: false,
        });

        const { ctx, getBadRequestBody } = createMockContext(playerOne);
        await gameSearch(ctx);

        assert.isDefined(getBadRequestBody());
        assert.equal(MATCHMAKING_QUEUE.length, 0);
    });

    test("gameSearch skips queued opponents who already have an active game", async ({
        assert,
    }) => {
        const busyPlayer = await createUser("busy");
        const joiner = await createUser("joiner");
        const opponent = await createUser("opponent");
        await createValidDeckForUser(joiner.id, "joiner");
        await createValidDeckForUser(opponent.id, "opponent");

        addMatchmakingQueueItem(busyPlayer.id);

        await Game.create({
            playerOneId: busyPlayer.id,
            playerTwoId: opponent.id,
            data: bindUserIds(createGameData({ state: "MULLIGAN" }), busyPlayer.id, opponent.id),
            isFinished: false,
        });

        const result = expectResult(await gameSearch(createMockContext(joiner).ctx));

        assert.equal(result.message, "Waiting for an opponent to join...");
        assert.isString(result.searchSessionId);
        assert.equal(MATCHMAKING_QUEUE.length, 1);
        assert.equal(MATCHMAKING_QUEUE[0]!.userId, joiner.id);
    });

    test("createTrainingGame removes the user from matchmaking queue", async ({ assert }) => {
        await syncCards();

        const user = await createUser("training");
        user.onboardingCompletedAt = DateTime.now();
        await user.save();
        await createValidDeckForUser(user.id, "training");
        addMatchmakingQueueItem(user.id);

        const { ctx } = createMockContext(user);
        const result = expectResult(await createTrainingGame(ctx));

        assert.isNumber(result.gameId);
        assert.equal(MATCHMAKING_QUEUE.length, 0);
        assert.isNull(findQueueItemByUserId(user.id));

        const { ctx: meCtx } = createMockContext(user);
        const meResult = expectResult(await me(meCtx));
        assert.isNull(meResult.matchmakingSearchSessionId);
        assert.equal(meResult.currentGameId, result.gameId);
    });
});
