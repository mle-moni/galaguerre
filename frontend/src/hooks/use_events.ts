import type { ApiEvent } from "#api_types/event.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";
import { useUser } from "./use_user.js";

export const EVENTS_QUERY_KEY = ["events"] as const;

export const useEventsQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: EVENTS_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiEvent[]>("/api/events");
            return response.data;
        },
        enabled: !!user,
    });
};

export const useRegisterEventMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (eventId: number) => {
            const response = await privateAxios.post<ApiEvent>(`/api/events/${eventId}/register`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
        },
    });
};
