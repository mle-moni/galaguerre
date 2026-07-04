import type { ApiUser } from "#api_types/auth.types";
import type { QueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "~/hooks/use_user";

export const clearCurrentGameId = (queryClient: QueryClient, gameId?: number) => {
    queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
        if (!oldUser) return oldUser;
        if (gameId !== undefined && oldUser.currentGameId !== gameId) return oldUser;
        return { ...oldUser, currentGameId: null };
    });
};
