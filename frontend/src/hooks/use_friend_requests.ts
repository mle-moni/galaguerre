import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "~/services/client";
import { useUser } from "./use_user.js";
import { FRIENDS_QUERY_KEY } from "./use_friends.js";

export const FRIEND_REQUESTS_QUERY_KEY = ["friend-requests"] as const;
export const SENT_FRIEND_REQUESTS_QUERY_KEY = ["friend-requests", "sent"] as const;

export const useFriendRequestsQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: FRIEND_REQUESTS_QUERY_KEY,
        queryFn: async () => {
            return client.api.friendRequests.index({});
        },
        enabled: !!user,
    });
};

export const useSentFriendRequestsQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: SENT_FRIEND_REQUESTS_QUERY_KEY,
        queryFn: async () => {
            return client.api.friendRequests.sent({});
        },
        enabled: !!user,
    });
};

const invalidateFriendQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: FRIEND_REQUESTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SENT_FRIEND_REQUESTS_QUERY_KEY });
};

export const useAcceptFriendRequestMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (requestId: number) => {
            return await client.api.friendRequests.accept({
                params: { id: requestId },
            });
        },
        onSuccess: () => {
            invalidateFriendQueries(queryClient);
        },
    });
};

export const useDeclineFriendRequestMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (requestId: number) => {
            await client.api.friendRequests.destroy({
                params: { id: requestId },
            });
        },
        onSuccess: () => {
            invalidateFriendQueries(queryClient);
        },
    });
};

export const useCancelFriendRequestMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (requestId: number) => {
            await client.api.friendRequests.destroy({
                params: { id: requestId },
            });
        },
        onSuccess: () => {
            invalidateFriendQueries(queryClient);
        },
    });
};
