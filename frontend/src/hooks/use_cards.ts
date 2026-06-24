import type { ApiCatalogCard } from "#api_types/deck.types";
import { useQuery } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const cardsQueryKey = (includeNonCollectible = false) =>
    ["cards", { includeNonCollectible }] as const;

export const useCardsQuery = ({ includeNonCollectible = false } = {}) => {
    return useQuery({
        queryKey: cardsQueryKey(includeNonCollectible),
        queryFn: async () => {
            const response = await privateAxios.get<ApiCatalogCard[]>("/api/cards", {
                params: includeNonCollectible ? { includeNonCollectible: true } : undefined,
            });
            return response.data;
        },
    });
};
