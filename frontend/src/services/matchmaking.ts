import type { ApiUser } from "#api_types/auth.types";
import type {
    CancelGameSearchResponse,
    GameSearchHeartbeatResponse,
    GameSearchResponse,
} from "#api_types/matchmaking.types";
import type { QueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { privateAxios } from "./axios";

export const MATCHMAKING_HEARTBEAT_INTERVAL_MS = 10_000;

export const clearMatchmakingSession = (queryClient: QueryClient) => {
    queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
        if (!oldUser) return oldUser;
        return { ...oldUser, matchmakingSearchSessionId: null };
    });
};

export const startGameSearch = async () => {
    const response = await privateAxios.post<GameSearchResponse>("/api/games");
    return response.data;
};

export const cancelGameSearchRequest = async (searchSessionId: string) => {
    const response = await privateAxios.delete<CancelGameSearchResponse>("/api/games/search", {
        data: { searchSessionId },
    });
    return response.data;
};

export const sendGameSearchHeartbeat = async (searchSessionId: string) => {
    const response = await privateAxios.post<GameSearchHeartbeatResponse>(
        "/api/games/search/heartbeat",
        { searchSessionId },
    );
    return response.data;
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
