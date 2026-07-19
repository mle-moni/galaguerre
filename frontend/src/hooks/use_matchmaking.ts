import type { ApiUser } from "#api_types/auth.types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApiMutation } from "~/hooks/use_api_mutation";
import {
    MATCHMAKING_HEARTBEAT_INTERVAL_MS,
    cancelGameSearchRequest,
    clearMatchmakingSession,
    sendGameSearchHeartbeat,
    startGameSearch,
} from "~/services/matchmaking";
import { play } from "~/cuelume/index";
import { CLIENT_SOCKET } from "~/services/ws_client";
import { USER_QUERY_KEY, useUser } from "./use_user.js";

export const useMatchmaking = () => {
    const user = useUser();
    const queryClient = useQueryClient();

    const isSearching = Boolean(user?.matchmakingSearchSessionId && !user.currentGameId);

    const startSearchMutation = useApiMutation({
        mutationFn: startGameSearch,
        onSuccess: (data) => {
            if (!data.searchSessionId) return;

            queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
                if (!oldUser) return oldUser;
                return { ...oldUser, matchmakingSearchSessionId: data.searchSessionId ?? null };
            });
        },
    });

    const cancelSearchMutation = useApiMutation({
        showErrorToast: false,
        mutationFn: async () => {
            const sessionId = queryClient.getQueryData<ApiUser | null>(
                USER_QUERY_KEY,
            )?.matchmakingSearchSessionId;

            if (!sessionId) return;

            await cancelGameSearchRequest(sessionId);
        },
        onSettled: () => {
            clearMatchmakingSession(queryClient);
        },
    });

    return {
        isSearching,
        startSearch: startSearchMutation.mutate,
        cancelSearch: cancelSearchMutation.mutate,
        isStarting: startSearchMutation.isPending,
        isCancelling: cancelSearchMutation.isPending,
    };
};

export const useMatchmakingOrchestrator = () => {
    const user = useUser();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const wasSearchingRef = useRef(false);

    const isSearching = Boolean(user?.matchmakingSearchSessionId && !user.currentGameId);

    useEffect(() => {
        if (isSearching) {
            wasSearchingRef.current = true;
        }
    }, [isSearching]);

    useEffect(() => {
        const onGameCreated = () => {
            wasSearchingRef.current = true;
        };

        CLIENT_SOCKET.on("game:created", onGameCreated);
        return () => {
            CLIENT_SOCKET.off("game:created", onGameCreated);
        };
    }, []);

    const handleMatched = useCallback(
        (gameId: number) => {
            wasSearchingRef.current = true;
            queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
                if (!oldUser) return oldUser;
                return {
                    ...oldUser,
                    currentGameId: gameId,
                    matchmakingSearchSessionId: null,
                };
            });
        },
        [queryClient],
    );

    useEffect(() => {
        if (!user?.matchmakingSearchSessionId || user.currentGameId) return;

        const sessionId = user.matchmakingSearchSessionId;

        const sendHeartbeat = async () => {
            try {
                const result = await sendGameSearchHeartbeat(sessionId);

                if (result.status === "matched") {
                    const currentUser = queryClient.getQueryData<ApiUser | null>(USER_QUERY_KEY);
                    if (currentUser?.matchmakingSearchSessionId && !currentUser.currentGameId) {
                        play("sparkle");
                    }

                    handleMatched(result.gameId);
                    return;
                }

                if (result.status === "idle") {
                    wasSearchingRef.current = false;
                    clearMatchmakingSession(queryClient);
                }
            } catch {
                // Ignore transient heartbeat errors; next tick will retry.
            }
        };

        void sendHeartbeat();

        const interval = setInterval(() => {
            void sendHeartbeat();
        }, MATCHMAKING_HEARTBEAT_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [handleMatched, queryClient, user?.currentGameId, user?.matchmakingSearchSessionId]);

    useEffect(() => {
        if (!user?.currentGameId || !wasSearchingRef.current || location.pathname === "/play") {
            return;
        }

        wasSearchingRef.current = false;
        navigate("/play");
    }, [location.pathname, navigate, user?.currentGameId]);
};
