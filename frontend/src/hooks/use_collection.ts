import { useQueryClient } from "@tanstack/react-query";
import { DAILY_QUESTS_QUERY_KEY } from "~/hooks/use_daily_quests";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { useApiQuery } from "~/hooks/use_api_query";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { client } from "~/services/client";

export const COLLECTION_QUERY_KEY = ["collection"] as const;
export const PACKS_QUERY_KEY = ["packs"] as const;
export const DUPLICATES_PREVIEW_QUERY_KEY = ["collection", "duplicates-preview"] as const;

export const useCollectionQuery = (options?: { enabled?: boolean }) => {
    return useApiQuery({
        queryKey: COLLECTION_QUERY_KEY,
        queryFn: async () => {
            const data = await client.api.collection.index({});
            return data.entries;
        },
        enabled: options?.enabled ?? true,
    });
};

export const usePacksQuery = () => {
    return useApiQuery({
        queryKey: PACKS_QUERY_KEY,
        queryFn: async () => {
            return client.api.collection.packs({});
        },
    });
};

export const useDuplicatesPreviewQuery = (enabled: boolean) => {
    return useApiQuery({
        queryKey: DUPLICATES_PREVIEW_QUERY_KEY,
        queryFn: async () => {
            return client.api.collection.duplicatesPreview({});
        },
        enabled,
    });
};

export const useSellDuplicatesMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async () => {
            return client.api.collection.sellDuplicates({});
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

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async ({ cardId, golden }: { cardId: number; golden?: boolean }) => {
            return client.api.collection.buyCard({ body: { cardId, golden } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        },
    });
};

export const useSellCardMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async (cardId: number) => {
            return client.api.collection.sellCard({ body: { cardId } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        },
    });
};

export const useOpenPackMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async () => {
            const data = await client.api.collection.openPack({});
            return data.cards;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: DAILY_QUESTS_QUERY_KEY });
        },
    });
};

export const useBuyPackMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async () => {
            return client.api.rewards.buyPack({});
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

export const entriesToOwnedGoldenCounts = (
    entries: { cardId: number; goldenCount: number }[],
): Map<number, number> => new Map(entries.map((entry) => [entry.cardId, entry.goldenCount]));
