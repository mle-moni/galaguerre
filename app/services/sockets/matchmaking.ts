interface MatchmakingQueueItem {
    userId: number;
}

export const MATCHMAKING_QUEUE: MatchmakingQueueItem[] = [];

export const addMatchmakingQueueItem = (userId: number) => {
    MATCHMAKING_QUEUE.push({ userId });
};

export const removeMatchmakingQueueItem = (userId: number) => {
    const index = MATCHMAKING_QUEUE.findIndex((item) => item.userId === userId);

    if (index === -1) return;

    MATCHMAKING_QUEUE.splice(index, 1);
};
