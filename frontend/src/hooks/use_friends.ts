import type { AddFriendPayload, ApiFriend, ApiFriendSearchResult } from "#api_types/friend.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";
import { useUser } from "./use_user.js";

export const FRIENDS_QUERY_KEY = ["friends"] as const;

export const friendSearchQueryKey = (search: string) =>
    [...FRIENDS_QUERY_KEY, "search", search] as const;

export const useFriendsQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: FRIENDS_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxios.get<ApiFriend[]>("/api/friends");
            return response.data;
        },
        enabled: !!user,
    });
};

export const useFriendSearchQuery = (search: string) => {
    const user = useUser();
    const normalizedSearch = search.trim();

    return useQuery({
        queryKey: friendSearchQueryKey(normalizedSearch),
        queryFn: async () => {
            const response = await privateAxios.get<ApiFriendSearchResult[]>(
                "/api/friends/search",
                {
                    params: { q: normalizedSearch },
                },
            );
            return response.data;
        },
        enabled: !!user && normalizedSearch.length >= 2,
    });
};

export const useAddFriendMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (friendUserId: number) => {
            const payload: AddFriendPayload = { friendUserId };
            const response = await privateAxios.post<ApiFriend>("/api/friends", payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
        },
    });
};

export const useRemoveFriendMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (friendUserId: number) => {
            await privateAxios.delete(`/api/friends/${friendUserId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
        },
    });
};
