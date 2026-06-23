import type { ApiUser } from "#api_types/auth.types";
import type { QueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "~/hooks/use_user";

export const applyTrainingGameStarted = (queryClient: QueryClient, gameId: number) => {
    queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
        if (!oldUser) return oldUser;
        return {
            ...oldUser,
            currentGameId: gameId,
            matchmakingSearchSessionId: null,
        };
    });
};
