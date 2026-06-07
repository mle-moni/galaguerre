import type { ApiCardSet } from "#api_types/deck.types";
import { useQuery } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const CARD_SETS_QUERY_KEY = ["card-sets"];

export const useCardSetsQuery = () => {
    return useQuery({
        queryKey: CARD_SETS_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiCardSet[]>("/api/card-sets");
            return response.data;
        },
    });
};
