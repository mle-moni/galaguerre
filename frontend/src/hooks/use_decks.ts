import type { ApiDeck, UpdateDeckPayload } from "#api_types/deck.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";
import { useUser } from "./use_user.js";

export const DECKS_QUERY_KEY = ["decks"];

export const useDecksQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: DECKS_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiDeck[]>("/api/decks");
            return response.data;
        },
        enabled: !!user,
    });
};

export const useDeckQuery = (deckId: number) => {
    const user = useUser();

    return useQuery({
        queryKey: [...DECKS_QUERY_KEY, deckId],
        queryFn: async () => {
            const response = await privateAxios.get<ApiDeck>(`/api/decks/${deckId}`);
            return response.data;
        },
        enabled: !!user && deckId > 0,
    });
};

export const useCreateDeckMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post<ApiDeck>("/api/decks");
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};

export const useUpdateDeckMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ deckId, payload }: { deckId: number; payload: UpdateDeckPayload }) => {
            const response = await privateAxios.put<ApiDeck>(`/api/decks/${deckId}`, payload);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
            queryClient.setQueryData([...DECKS_QUERY_KEY, data.id], data);
        },
    });
};

export const useDeleteDeckMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (deckId: number) => {
            await privateAxios.delete(`/api/decks/${deckId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};

export const useSelectDeckMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (deckId: number) => {
            const response = await privateAxios.post<ApiDeck>(`/api/decks/${deckId}/select`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};
