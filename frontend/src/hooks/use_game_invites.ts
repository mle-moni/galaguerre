import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiUser } from "#api_types/auth.types";
import { client } from "~/services/client";
import { USER_QUERY_KEY, useUser } from "./use_user.js";

export const GAME_INVITES_QUERY_KEY = ["game-invites"] as const;
export const SENT_GAME_INVITES_QUERY_KEY = ["game-invites", "sent"] as const;

export const useGameInvitesQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: GAME_INVITES_QUERY_KEY,
        queryFn: async () => {
            return client.api.gameInvites.index({});
        },
        enabled: !!user,
    });
};

export const useSentGameInvitesQuery = () => {
    const user = useUser();

    return useQuery({
        queryKey: SENT_GAME_INVITES_QUERY_KEY,
        queryFn: async () => {
            return client.api.gameInvites.sent({});
        },
        enabled: !!user,
    });
};

const invalidateGameInviteQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: GAME_INVITES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SENT_GAME_INVITES_QUERY_KEY });
};

export const useSendGameInviteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (toUserId: number) => {
            return await client.api.gameInvites.store({
                body: { toUserId },
            });
        },
        onSuccess: () => {
            invalidateGameInviteQueries(queryClient);
        },
    });
};

export const useAcceptGameInviteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (inviteId: number) => {
            return await client.api.gameInvites.accept({
                params: { id: inviteId },
            });
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
                if (!oldUser) return oldUser;
                return {
                    ...oldUser,
                    currentGameId: data.gameId,
                    matchmakingSearchSessionId: null,
                };
            });
            invalidateGameInviteQueries(queryClient);
        },
    });
};

export const useDeclineGameInviteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (inviteId: number) => {
            await client.api.gameInvites.destroy({
                params: { id: inviteId },
            });
        },
        onSuccess: () => {
            invalidateGameInviteQueries(queryClient);
        },
    });
};

export const useCancelGameInviteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (inviteId: number) => {
            await client.api.gameInvites.destroy({
                params: { id: inviteId },
            });
        },
        onSuccess: () => {
            invalidateGameInviteQueries(queryClient);
        },
    });
};
