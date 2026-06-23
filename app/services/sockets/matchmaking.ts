import { randomUUID } from "node:crypto";

export interface MatchmakingQueueItem {
    userId: number;
    searchSessionId: string;
    lastHeartbeatAt: number;
}

export const MATCHMAKING_QUEUE: MatchmakingQueueItem[] = [];

export const MATCHMAKING_TTL_MS = 20_000;

const MATCHMAKING_GRACE_MS = 8_000;

const pendingRemovals = new Map<number, ReturnType<typeof setTimeout>>();

const now = () => Date.now();

const isStale = (item: MatchmakingQueueItem) => now() - item.lastHeartbeatAt > MATCHMAKING_TTL_MS;

export const purgeStaleEntries = () => {
    for (let index = MATCHMAKING_QUEUE.length - 1; index >= 0; index--) {
        if (isStale(MATCHMAKING_QUEUE[index]!)) {
            MATCHMAKING_QUEUE.splice(index, 1);
        }
    }
};

export const findQueueItemByUserId = (userId: number) => {
    purgeStaleEntries();
    return MATCHMAKING_QUEUE.find((item) => item.userId === userId) ?? null;
};

export const findQueueItemBySessionId = (searchSessionId: string) => {
    purgeStaleEntries();
    return MATCHMAKING_QUEUE.find((item) => item.searchSessionId === searchSessionId) ?? null;
};

export const addMatchmakingQueueItem = (userId: number): string => {
    cancelMatchmakingRemoval(userId);
    purgeStaleEntries();

    const existing = findQueueItemByUserId(userId);
    if (existing) {
        existing.lastHeartbeatAt = now();
        return existing.searchSessionId;
    }

    const searchSessionId = randomUUID();
    MATCHMAKING_QUEUE.push({
        userId,
        searchSessionId,
        lastHeartbeatAt: now(),
    });

    return searchSessionId;
};

export const removeMatchmakingQueueItem = (userId: number) => {
    const index = MATCHMAKING_QUEUE.findIndex((item) => item.userId === userId);

    if (index === -1) return;

    MATCHMAKING_QUEUE.splice(index, 1);
};

export const touchHeartbeat = (searchSessionId: string) => {
    purgeStaleEntries();

    const item = MATCHMAKING_QUEUE.find((entry) => entry.searchSessionId === searchSessionId);
    if (!item || isStale(item)) return null;

    item.lastHeartbeatAt = now();
    return item;
};

export const cancelSearch = (searchSessionId: string, userId: number) => {
    purgeStaleEntries();

    const index = MATCHMAKING_QUEUE.findIndex(
        (item) => item.searchSessionId === searchSessionId && item.userId === userId,
    );

    if (index === -1) return false;

    MATCHMAKING_QUEUE.splice(index, 1);
    cancelMatchmakingRemoval(userId);
    return true;
};

export const claimOpponent = (excludeUserId: number) => {
    purgeStaleEntries();

    while (MATCHMAKING_QUEUE.length > 0) {
        const opponent = MATCHMAKING_QUEUE.shift()!;

        if (opponent.userId === excludeUserId || isStale(opponent)) {
            continue;
        }

        return opponent;
    }

    return null;
};

export const scheduleMatchmakingRemoval = (userId: number) => {
    cancelMatchmakingRemoval(userId);

    const timeout = setTimeout(() => {
        removeMatchmakingQueueItem(userId);
        pendingRemovals.delete(userId);
    }, MATCHMAKING_GRACE_MS);

    pendingRemovals.set(userId, timeout);
};

export const removeMatchmakingImmediately = (userId: number) => {
    cancelMatchmakingRemoval(userId);
    removeMatchmakingQueueItem(userId);
};

export const cancelMatchmakingRemoval = (userId: number) => {
    const timeout = pendingRemovals.get(userId);

    if (!timeout) return;

    clearTimeout(timeout);
    pendingRemovals.delete(userId);
};
