import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";
import { useUser } from "./use_user.js";

export const EVENTS_QUERY_KEY = ["events"] as const;

export const useEventsQuery = () => {
    const user = useUser();

    return useApiQuery({
        queryKey: EVENTS_QUERY_KEY,
        queryFn: async () => {
            return client.api.events.index({});
        },
        enabled: !!user,
    });
};

export const useRegisterEventMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        showErrorToast: false,
        mutationFn: async (eventId: number) => {
            return client.api.events.register({
                params: { id: eventId },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
        },
    });
};
