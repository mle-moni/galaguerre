import { useQuery } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const useGameState = (gameId: number) => {
    const query = useQuery({
        queryKey: ["gameState"],
        queryFn: async () => {
            const response = await privateAxios.get(`/api/games/${gameId}`);

            return response.data;
        },
    });

    return query;
};
