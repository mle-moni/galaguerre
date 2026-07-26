import type { ApiDevStatsV1Response } from "#api_types/dev_stats.types";
import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";

export const DEV_STATS_V1_QUERY_KEY = ["dev", "stats", "v1"] as const;

export const useDevStatsV1Query = () => {
    return useApiQuery({
        queryKey: DEV_STATS_V1_QUERY_KEY,
        queryFn: async (): Promise<ApiDevStatsV1Response> => {
            return client.api.devStats.v1({}) as Promise<ApiDevStatsV1Response>;
        },
        showErrorToast: true,
        errorMessage: "Impossible de charger les stats",
    });
};
