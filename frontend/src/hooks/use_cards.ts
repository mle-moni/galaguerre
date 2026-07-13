import { useApiQuery } from "~/hooks/use_api_query";
import { client, publicClient } from "~/services/client";

export const cardsQueryKey = (includeNonCollectible = false, usePublicClient = false) =>
    ["cards", { includeNonCollectible, usePublicClient }] as const;

export const useCardsQuery = ({ includeNonCollectible = false, usePublicClient = false } = {}) => {
    const apiClient = usePublicClient ? publicClient : client;

    return useApiQuery({
        queryKey: cardsQueryKey(includeNonCollectible, usePublicClient),
        queryFn: async () => {
            return apiClient.api.cards.index({
                query: includeNonCollectible ? { includeNonCollectible: true } : {},
            });
        },
    });
};
