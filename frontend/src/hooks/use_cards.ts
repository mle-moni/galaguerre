import type { ApiCatalogCard } from "#api_types/deck.types";
import { useQuery } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const CARDS_QUERY_KEY = ["cards"];

export const useCardsQuery = () => {
    return useQuery({
        queryKey: CARDS_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiCatalogCard[]>("/api/cards");
            return response.data;
        },
    });
};
