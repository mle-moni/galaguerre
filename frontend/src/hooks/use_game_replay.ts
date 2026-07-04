import { useApiQuery } from "~/hooks/use_api_query";
import { publicClient } from "~/services/client";

export const gameReplayQueryKey = (userId: number, gameId: number) =>
    ["game-replay", userId, gameId] as const;

export const useGameReplayQuery = (userId: number, gameId: number) => {
    return useApiQuery({
        queryKey: gameReplayQueryKey(userId, gameId),
        queryFn: async () => {
            return publicClient.api.gameHistory.replay({
                params: { userId, gameId },
            });
        },
        enabled: Number.isFinite(userId) && userId > 0 && Number.isFinite(gameId) && gameId > 0,
    });
};
