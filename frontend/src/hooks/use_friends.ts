import type { AddFriendPayload } from "#api_types/friend.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "~/services/client";
import { useUser } from "./use_user.js";
import {
    FRIEND_REQUESTS_QUERY_KEY,
    SENT_FRIEND_REQUESTS_QUERY_KEY,
} from "./use_friend_requests.js";

export const FRIENDS_QUERY_KEY = ["friends"] as const;

export const friendSearchQueryKey = (search: string) =>
    [...FRIENDS_QUERY_KEY, "search", search] as const;

export const useFriendsQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: FRIENDS_QUERY_KEY,
        queryFn: async () => {
            return client.api.friends.index({});
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
            return client.api.friends.search({ query: { q: normalizedSearch } });
        },
        enabled: !!user && normalizedSearch.length >= 2,
    });
};

export const useAddFriendMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (friendUserId: number) => {
            const payload: AddFriendPayload = { friendUserId };
            return client.api.friends.store({ body: payload });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: FRIEND_REQUESTS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: SENT_FRIEND_REQUESTS_QUERY_KEY });
        },
    });
};

export const useRemoveFriendMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (friendUserId: number) => {
            await client.api.friends.destroy({
                params: { friendUserId },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
        },
    });
};
