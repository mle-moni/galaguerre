interface MatchmakingQueueItem {
    userId: number;
}

export const MATCHMAKING_QUEUE: MatchmakingQueueItem[] = [];

const MATCHMAKING_GRACE_MS = 8_000;

const pendingRemovals = new Map<number, ReturnType<typeof setTimeout>>();

export const addMatchmakingQueueItem = (userId: number) => {
    cancelMatchmakingRemoval(userId);
    MATCHMAKING_QUEUE.push({ userId });
};

export const removeMatchmakingQueueItem = (userId: number) => {
    const index = MATCHMAKING_QUEUE.findIndex((item) => item.userId === userId);

    if (index === -1) return;

    MATCHMAKING_QUEUE.splice(index, 1);
};

export const scheduleMatchmakingRemoval = (userId: number) => {
    cancelMatchmakingRemoval(userId);

    const timeout = setTimeout(() => {
        removeMatchmakingQueueItem(userId);
        pendingRemovals.delete(userId);
    }, MATCHMAKING_GRACE_MS);

    pendingRemovals.set(userId, timeout);
};

export const cancelMatchmakingRemoval = (userId: number) => {
    const timeout = pendingRemovals.get(userId);

    if (!timeout) return;

    clearTimeout(timeout);
    pendingRemovals.delete(userId);
};
