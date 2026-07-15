import { test } from "@japa/runner";
import {
    MATCHMAKING_QUEUE,
    MATCHMAKING_TTL_MS,
    addMatchmakingQueueItem,
    cancelSearch,
    claimOpponent,
    findQueueItemBySessionId,
    findQueueItemByUserId,
    purgeStaleEntries,
    touchHeartbeat,
} from "#services/sockets/matchmaking";

test.group("matchmaking queue", (group) => {
    group.each.setup(() => {
        MATCHMAKING_QUEUE.length = 0;
    });

    test("addMatchmakingQueueItem returns the same session for duplicate joins", ({ assert }) => {
        const first = addMatchmakingQueueItem(42);
        const second = addMatchmakingQueueItem(42);

        assert.equal(first.searchSessionId, second.searchSessionId);
        assert.isFalse(second.isNewEntry);
        assert.equal(MATCHMAKING_QUEUE.length, 1);
    });

    test("touchHeartbeat keeps an active session alive", ({ assert }) => {
        const { searchSessionId: sessionId } = addMatchmakingQueueItem(7);
        const item = MATCHMAKING_QUEUE[0]!;
        item.lastHeartbeatAt = Date.now() - MATCHMAKING_TTL_MS + 1_000;

        const touched = touchHeartbeat(sessionId);

        assert.isNotNull(touched);
        assert.equal(touched?.userId, 7);
        assert.isTrue(findQueueItemBySessionId(sessionId) !== null);
    });

    test("purgeStaleEntries removes expired sessions", ({ assert }) => {
        const { searchSessionId: sessionId } = addMatchmakingQueueItem(9);
        MATCHMAKING_QUEUE[0]!.lastHeartbeatAt = Date.now() - MATCHMAKING_TTL_MS - 1;

        purgeStaleEntries();

        assert.equal(MATCHMAKING_QUEUE.length, 0);
        assert.isNull(findQueueItemBySessionId(sessionId));
    });

    test("cancelSearch removes only the matching user session", ({ assert }) => {
        const { searchSessionId: sessionId } = addMatchmakingQueueItem(3);
        addMatchmakingQueueItem(4);

        const cancelled = cancelSearch(sessionId, 3);

        assert.isTrue(cancelled);
        assert.equal(MATCHMAKING_QUEUE.length, 1);
        assert.equal(MATCHMAKING_QUEUE[0]!.userId, 4);
    });

    test("claimOpponent skips stale entries and self", ({ assert }) => {
        const { searchSessionId: staleSessionId } = addMatchmakingQueueItem(1);
        MATCHMAKING_QUEUE[0]!.lastHeartbeatAt = Date.now() - MATCHMAKING_TTL_MS - 1;

        const { searchSessionId: waitingSessionId } = addMatchmakingQueueItem(2);
        addMatchmakingQueueItem(3);

        const opponent = claimOpponent(3);

        assert.isNotNull(opponent);
        assert.equal(opponent?.userId, 2);
        assert.equal(opponent?.searchSessionId, waitingSessionId);
        assert.isNull(findQueueItemBySessionId(staleSessionId));
        assert.equal(MATCHMAKING_QUEUE.length, 1);
        assert.equal(MATCHMAKING_QUEUE[0]!.userId, 3);
    });

    test("findQueueItemByUserId returns null after cancel", ({ assert }) => {
        const { searchSessionId: sessionId } = addMatchmakingQueueItem(11);

        cancelSearch(sessionId, 11);

        assert.isNull(findQueueItemByUserId(11));
    });
});
