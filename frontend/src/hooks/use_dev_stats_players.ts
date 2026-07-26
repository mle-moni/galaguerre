import type { ApiDevPlayerStatsResponse } from "#api_types/dev_stats.types";
import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";

export const DEV_STATS_PLAYERS_QUERY_KEY = ["dev", "stats", "players"] as const;

export const useDevStatsPlayersQuery = () => {
    return useApiQuery({
        queryKey: DEV_STATS_PLAYERS_QUERY_KEY,
        queryFn: async (): Promise<ApiDevPlayerStatsResponse> => {
            return client.api.devStats.players({}) as Promise<ApiDevPlayerStatsResponse>;
        },
        showErrorToast: true,
        errorMessage: "Impossible de charger les stats joueurs",
    });
};
