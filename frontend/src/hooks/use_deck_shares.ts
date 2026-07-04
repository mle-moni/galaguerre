import { useQueryClient } from "@tanstack/react-query";
import { getTuyauErrorResponse } from "~/helpers/tuyau_errors";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { useApiQuery } from "~/hooks/use_api_query";
import { client, publicClient } from "~/services/client";
import { DECKS_QUERY_KEY } from "./use_decks.js";

export const deckShareQueryKey = (code: string) => ["deck-share", code] as const;

export const useDeckShareQuery = (code: string) => {
    return useApiQuery({
        queryKey: deckShareQueryKey(code),
        queryFn: async () => {
            return publicClient.api.deckShares.show({
                params: { code },
            });
        },
        enabled: code.length > 0,
    });
};

export const useShareDeckMutation = () => {
    return useApiMutation({
        showErrorToast: false,
        mutationFn: async (deckId: number) => {
            return client.api.deckShares.store({
                params: { deckId },
            });
        },
    });
};

export const useImportDeckShareMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async (shareCode: string) => {
            return client.api.deckShares.import({
                body: { shareCode },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};

export const getDeckShareImportErrorMessage = (error: unknown): string | null => {
    const response = getTuyauErrorResponse(error);
    if (!response || typeof response !== "object") {
        return null;
    }

    const data = response as { error?: string };
    return data.error ?? null;
};
