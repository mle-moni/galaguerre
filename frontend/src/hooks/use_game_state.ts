import type { ApiGame } from "#api_types/game.types";
import { useQuery } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const getGameStateQueryKey = (gameId: number) => ["gameState", gameId];

export const useGameState = (gameId: number) => {
    const query = useQuery({
        queryKey: getGameStateQueryKey(gameId),
        queryFn: async () => {
            const response = await privateAxios.get<ApiGame>(`/api/games/${gameId}`);

            return response.data;
        },
    });

    return query;
};
