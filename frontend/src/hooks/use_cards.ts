import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";

export const cardsQueryKey = (includeNonCollectible = false) =>
    ["cards", { includeNonCollectible }] as const;

export const useCardsQuery = ({ includeNonCollectible = false } = {}) => {
    return useApiQuery({
        queryKey: cardsQueryKey(includeNonCollectible),
        queryFn: async () => {
            return client.api.cards.index({
                query: includeNonCollectible ? { includeNonCollectible: true } : {},
            });
        },
    });
};
