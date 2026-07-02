import type {
    ApiDeckShare,
    CreateDeckShareResponse,
    ImportDeckResponse,
} from "#api_types/deck_share.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { privateAxios, publicAxios } from "~/services/axios";
import { DECKS_QUERY_KEY } from "./use_decks.js";

export const deckShareQueryKey = (code: string) => ["deck-share", code] as const;

export const useDeckShareQuery = (code: string) => {
    return useQuery({
        queryKey: deckShareQueryKey(code),
        queryFn: async () => {
            const response = await publicAxios.get<ApiDeckShare>(`/api/deck-shares/${code}`);
            return response.data;
        },
        enabled: code.length > 0,
    });
};

export const useShareDeckMutation = () => {
    return useMutation({
        mutationFn: async (deckId: number) => {
            const response = await privateAxios.post<CreateDeckShareResponse>(
                `/api/decks/${deckId}/share`,
            );
            return response.data;
        },
    });
};

export const useImportDeckShareMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (shareCode: string) => {
            const response = await privateAxios.post<ImportDeckResponse>("/api/decks/import", {
                shareCode,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};

export const getDeckShareImportErrorMessage = (error: unknown): string | null => {
    if (!isAxiosError(error) || !error.response?.data) {
        return null;
    }

    const data = error.response.data as { error?: string };
    return data.error ?? null;
};
