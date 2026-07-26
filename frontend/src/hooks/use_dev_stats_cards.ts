import type { ApiDevCardsStatsResponse } from "#api_types/dev_stats.types";
import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";

export const DEV_STATS_CARDS_QUERY_KEY = ["dev", "stats", "cards"] as const;

export const useDevStatsCardsQuery = () => {
    return useApiQuery({
        queryKey: DEV_STATS_CARDS_QUERY_KEY,
        queryFn: async (): Promise<ApiDevCardsStatsResponse> => {
            return client.api.devStats.cards({}) as Promise<ApiDevCardsStatsResponse>;
        },
        showErrorToast: true,
        errorMessage: "Impossible de charger les stats cartes",
    });
};
