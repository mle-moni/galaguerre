import type {
    ApiBuyCardResponse,
    ApiCollectionResponse,
    ApiDuplicatesPreviewResponse,
    ApiSellCardResponse,
    ApiSellDuplicatesResponse,
} from "#api_types/collection.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";
import { USER_QUERY_KEY } from "~/hooks/use_user";

export const COLLECTION_QUERY_KEY = ["collection"] as const;
export const PACKS_QUERY_KEY = ["packs"] as const;
export const DUPLICATES_PREVIEW_QUERY_KEY = ["collection", "duplicates-preview"] as const;

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
            const response = await privateAxios.get<{ unopenedCount: number }>("/api/packs");
            return response.data;
        },
    });
};

export const useDuplicatesPreviewQuery = (enabled: boolean) => {
    return useQuery({
        queryKey: DUPLICATES_PREVIEW_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiDuplicatesPreviewResponse>(
                "/api/collection/duplicates-preview",
            );
            return response.data;
        },
        enabled,
    });
};

export const useSellDuplicatesMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post<ApiSellDuplicatesResponse>(
                "/api/collection/sell-duplicates",
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: DUPLICATES_PREVIEW_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        },
    });
};

export const useBuyCardMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (cardId: number) => {
            const response = await privateAxios.post<ApiBuyCardResponse>(
                "/api/collection/buy-card",
                {
                    cardId,
                },
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        },
    });
};

export const useSellCardMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (cardId: number) => {
            const response = await privateAxios.post<ApiSellCardResponse>(
                "/api/collection/sell-card",
                {
                    cardId,
                },
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        },
    });
};

export const useOpenPackMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post<{ cards: unknown[] }>("/api/packs/open");
            return response.data.cards;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
        },
    });
};

export const useBuyPackMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post<{ goldCoins: number; unopenedCount: number }>(
                "/api/packs/buy",
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
        },
    });
};

export const entriesToOwnedCounts = (
    entries: { cardId: number; count: number }[],
): Map<number, number> => new Map(entries.map((entry) => [entry.cardId, entry.count]));
