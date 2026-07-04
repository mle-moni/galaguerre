import type { ApiUser } from "#api_types/auth.types";
import type { QueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { client } from "./client.js";

export const MATCHMAKING_HEARTBEAT_INTERVAL_MS = 10_000;

export const clearMatchmakingSession = (queryClient: QueryClient) => {
    queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
        if (!oldUser) return oldUser;
        return { ...oldUser, matchmakingSearchSessionId: null };
    });
};

export const startGameSearch = async () => {
    return client.api.games.store({});
};

export const cancelGameSearchRequest = async (searchSessionId: string) => {
    return client.api.games.cancelSearch({
        body: { searchSessionId },
    });
};

export const sendGameSearchHeartbeat = async (searchSessionId: string) => {
    return client.api.games.searchHeartbeat({
        body: { searchSessionId },
    });
};

export const cancelActiveMatchmakingSearch = async (queryClient: QueryClient) => {
    const user = queryClient.getQueryData<ApiUser | null>(USER_QUERY_KEY);
    if (!user?.matchmakingSearchSessionId) return;

    try {
        await cancelGameSearchRequest(user.matchmakingSearchSessionId);
    } catch {
        // Best-effort cleanup before logout.
    } finally {
        clearMatchmakingSession(queryClient);
    }
};
