import type {
    ApiCollectionResponse,
    ApiOpenPackResponse,
    ApiPacksResponse,
} from "#api_types/collection.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const COLLECTION_QUERY_KEY = ["collection"] as const;
export const PACKS_QUERY_KEY = ["packs"] as const;

export const useCollectionQuery = () => {
    return useQuery({
        queryKey: COLLECTION_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiCollectionResponse>("/api/collection");
            return response.data.entries;
        },
    });
};

export const usePacksQuery = () => {
    return useQuery({
        queryKey: PACKS_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiPacksResponse>("/api/packs");
            return response.data;
        },
    });
};

export const useOpenPackMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post<ApiOpenPackResponse>("/api/packs/open");
            return response.data.cards;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
        },
    });
};

export const entriesToOwnedCounts = (
    entries: { cardId: number; count: number }[],
): Map<number, number> => new Map(entries.map((entry) => [entry.cardId, entry.count]));
