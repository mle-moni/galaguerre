import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";

export const CARD_SETS_QUERY_KEY = ["card-sets"];

export const useCardSetsQuery = () => {
    return useApiQuery({
        queryKey: CARD_SETS_QUERY_KEY,
        queryFn: async () => {
            return client.api.cardSets.index({});
        },
    });
};
