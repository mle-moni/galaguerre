import type { ApiGameHistoryDetail, ApiGameHistoryList } from "#api_types/game_history.types";
import { useQuery } from "@tanstack/react-query";
import { publicAxios } from "~/services/axios";

export const gameHistoryListQueryKey = (userId: number) => ["game-history", userId] as const;

export const gameHistoryDetailQueryKey = (userId: number, gameId: number) =>
    ["game-history", userId, gameId] as const;

export const useGameHistoryListQuery = (userId: number) => {
    return useQuery({
        queryKey: gameHistoryListQueryKey(userId),
        queryFn: async () => {
            const response = await publicAxios.get<ApiGameHistoryList>(
                `/api/game-history/${userId}`,
            );
            return response.data;
        },
        enabled: Number.isFinite(userId) && userId > 0,
    });
};

export const useGameHistoryDetailQuery = (userId: number, gameId: number) => {
    return useQuery({
        queryKey: gameHistoryDetailQueryKey(userId, gameId),
        queryFn: async () => {
            const response = await publicAxios.get<ApiGameHistoryDetail>(
                `/api/game-history/${userId}/${gameId}`,
            );
            return response.data;
        },
        enabled: Number.isFinite(userId) && userId > 0 && Number.isFinite(gameId) && gameId > 0,
    });
};
