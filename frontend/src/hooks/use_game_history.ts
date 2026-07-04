import { useApiQuery } from "~/hooks/use_api_query";
import { publicClient } from "~/services/client";

export const gameHistoryListQueryKey = (userId: number) => ["game-history", userId] as const;

export const gameHistoryDetailQueryKey = (userId: number, gameId: number) =>
    ["game-history", userId, gameId] as const;

export const useGameHistoryListQuery = (userId: number) => {
    return useApiQuery({
        queryKey: gameHistoryListQueryKey(userId),
        queryFn: async () => {
            return publicClient.api.gameHistory.index({
                params: { userId },
            });
        },
        enabled: Number.isFinite(userId) && userId > 0,
    });
};

export const useGameHistoryDetailQuery = (userId: number, gameId: number) => {
    return useApiQuery({
        queryKey: gameHistoryDetailQueryKey(userId, gameId),
        queryFn: async () => {
            return publicClient.api.gameHistory.show({
                params: { userId, gameId },
            });
        },
        enabled: Number.isFinite(userId) && userId > 0 && Number.isFinite(gameId) && gameId > 0,
    });
};
