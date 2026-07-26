import type { ApiDevGameStatsResponse } from "#api_types/dev_stats.types";
import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";

export const DEV_STATS_GAMES_QUERY_KEY = ["dev", "stats", "games"] as const;

export const useDevStatsGamesQuery = () => {
    return useApiQuery({
        queryKey: DEV_STATS_GAMES_QUERY_KEY,
        queryFn: async (): Promise<ApiDevGameStatsResponse> => {
            return client.api.devStats.games({}) as Promise<ApiDevGameStatsResponse>;
        },
        showErrorToast: true,
        errorMessage: "Impossible de charger les stats parties",
    });
};
