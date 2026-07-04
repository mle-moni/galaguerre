import type { UpdateDeckPayload } from "#api_types/deck.types";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";
import { useUser } from "./use_user.js";

export const DECKS_QUERY_KEY = ["decks"];

export const useDecksQuery = () => {
    const user = useUser();

    return useApiQuery({
        queryKey: DECKS_QUERY_KEY,
        queryFn: async () => {
            return client.api.decks.index({});
        },
        enabled: !!user,
    });
};

export const useDeckQuery = (deckId: number) => {
    const user = useUser();

    return useApiQuery({
        queryKey: [...DECKS_QUERY_KEY, deckId],
        queryFn: async () => {
            return client.api.decks.show({
                params: { id: deckId },
            });
        },
        enabled: !!user && deckId > 0,
    });
};

export const useCreateDeckMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        mutationFn: async () => {
            return client.api.decks.store({});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};

export const useUpdateDeckMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async ({ deckId, payload }: { deckId: number; payload: UpdateDeckPayload }) => {
            return client.api.decks.update({
                params: { id: deckId },
                body: payload,
            });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
            queryClient.setQueryData([...DECKS_QUERY_KEY, data.id], data);
        },
    });
};

export const useDeleteDeckMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        mutationFn: async (deckId: number) => {
            await client.api.decks.destroy({
                params: { id: deckId },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};

export const useSelectDeckMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        mutationFn: async (deckId: number) => {
            return client.api.decks.select({
                params: { id: deckId },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
        },
    });
};
