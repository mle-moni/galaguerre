import { test } from "@japa/runner";
import {
    MATCHMAKING_QUEUE,
    addMatchmakingQueueItem,
    cancelSearch,
    claimOpponent,
} from "#services/sockets/matchmaking";
import {
    canNotifyOpponentWaiting,
    notifyOpponentWaiting,
    notifyOpponentWaitingCancelledIfQueueEmpty,
} from "#services/sockets/matchmaking_notifications";

test.group("matchmaking notifications", (group) => {
    group.each.setup(() => {
        MATCHMAKING_QUEUE.length = 0;
    });

    test("canNotifyOpponentWaiting is true only for the lone searcher", ({ assert }) => {
        addMatchmakingQueueItem(42);

        assert.isTrue(canNotifyOpponentWaiting(42));
        assert.isFalse(canNotifyOpponentWaiting(43));
    });

    test("canNotifyOpponentWaiting is false when multiple players are queued", ({ assert }) => {
        addMatchmakingQueueItem(42);
        addMatchmakingQueueItem(43);

        assert.isFalse(canNotifyOpponentWaiting(42));
        assert.isFalse(canNotifyOpponentWaiting(43));
    });

    test("notifyOpponentWaiting does not throw for invalid states", ({ assert }) => {
        notifyOpponentWaiting(42);
        addMatchmakingQueueItem(42);
        addMatchmakingQueueItem(43);
        notifyOpponentWaiting(42);

        assert.equal(MATCHMAKING_QUEUE.length, 2);
    });

    test("cancelSearch on lone searcher leaves an empty queue", ({ assert }) => {
        const { searchSessionId } = addMatchmakingQueueItem(42);

        cancelSearch(searchSessionId, 42);

        assert.equal(MATCHMAKING_QUEUE.length, 0);
        notifyOpponentWaitingCancelledIfQueueEmpty();
    });

    test("claimOpponent empties the queue when the lone searcher is claimed", ({ assert }) => {
        addMatchmakingQueueItem(42);

        const opponent = claimOpponent(7);

        assert.equal(opponent?.userId, 42);
        assert.equal(MATCHMAKING_QUEUE.length, 0);
        notifyOpponentWaitingCancelledIfQueueEmpty();
    });
});
