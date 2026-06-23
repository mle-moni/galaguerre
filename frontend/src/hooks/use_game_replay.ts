import type { ApiGameReplay } from "#api_types/game_replay.types";
import { useQuery } from "@tanstack/react-query";
import { publicAxios } from "~/services/axios";

export const gameReplayQueryKey = (userId: number, gameId: number) =>
    ["game-replay", userId, gameId] as const;

export const useGameReplayQuery = (userId: number, gameId: number) => {
    return useQuery({
        queryKey: gameReplayQueryKey(userId, gameId),
        queryFn: async () => {
            const response = await publicAxios.get<ApiGameReplay>(
                `/api/game-history/${userId}/${gameId}/replay`,
            );
            return response.data;
        },
        enabled: Number.isFinite(userId) && userId > 0 && Number.isFinite(gameId) && gameId > 0,
    });
};
