import type { ApiGameInvite, ApiSentGameInvite } from "#api_types/game_invite.types";
import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import type { Socket } from "socket.io-client";
import { getGameStateQueryKey } from "~/hooks/use_game_state";
import { GAME_INVITES_QUERY_KEY, SENT_GAME_INVITES_QUERY_KEY } from "~/hooks/use_game_invites";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { fetchCurrentUser } from "./fetch_current_user.js";
import { startGameSearch } from "./matchmaking.js";
import { queryClient } from "./query_client.js";
import {
    dismissOpponentWaitingToast,
    notifyApiError,
    notifyError,
    notifyOpponentWaiting,
    notifySuccess,
} from "./toasts.js";
import { GAME_STORE } from "~/stores/store_singletons";
import {
    markSocketDisconnected,
    markSocketReconnecting,
    reauthenticateSocket,
    setSocketAuthSuccess,
    subscribeToSocketEvent,
} from "./ws_client.js";

let isReauthenticating = false;

const OPPONENT_WAITING_HIDDEN_ROUTES = new Set(["/play", "/login", "/register"]);

const shouldShowOpponentWaitingToast = () => {
    if (OPPONENT_WAITING_HIDDEN_ROUTES.has(window.location.pathname)) return false;

    const user = queryClient.getQueryData<ApiUser | null>(USER_QUERY_KEY);
    if (!user) return false;
    if (user.currentGameId) return false;
    if (user.matchmakingSearchSessionId) return false;

    return true;
};

const joinMatchmakingQueue = async () => {
    try {
        const data = await startGameSearch();

        if (!data.searchSessionId) return;

        queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
            if (!oldUser) return oldUser;
            return { ...oldUser, matchmakingSearchSessionId: data.searchSessionId ?? null };
        });
    } catch (error) {
        notifyApiError(error);
    }
};

const WS_EVENTS_SETUP_KEY = "__galaguerre_ws_events_setup__";

const hasRegisteredSocketEvents = () =>
    Boolean((globalThis as Record<string, unknown>)[WS_EVENTS_SETUP_KEY]);

const markSocketEventsRegistered = () => {
    (globalThis as Record<string, unknown>)[WS_EVENTS_SETUP_KEY] = true;
};

const resyncGameState = (user: ApiUser) => {
    if (!user.currentGameId) return;

    queryClient.invalidateQueries({ queryKey: getGameStateQueryKey(user.currentGameId) });
};

const reauthenticateAfterReconnect = async () => {
    if (isReauthenticating) return;

    isReauthenticating = true;

    try {
        const user = await queryClient.fetchQuery({
            queryKey: USER_QUERY_KEY,
            queryFn: fetchCurrentUser,
        });

        queryClient.setQueryData(USER_QUERY_KEY, user);
        reauthenticateSocket(user);
    } catch (error) {
        notifyApiError(error, "Impossible de se reconnecter");
    } finally {
        isReauthenticating = false;
    }
};

export const setupEvents = (socket: Socket) => {
    if (hasRegisteredSocketEvents()) return;
    markSocketEventsRegistered();

    socket.on("error", (error) => {
        console.error(error);
    });

    socket.on("debug", (...data) => {
        console.info("debug", ...data);
    });

    socket.on("disconnect", () => {
        setSocketAuthSuccess(false);
        markSocketReconnecting();
    });

    socket.io.on("reconnect_attempt", () => {
        setSocketAuthSuccess(false);
        markSocketReconnecting();
    });

    socket.io.on("reconnect", () => {
        void reauthenticateAfterReconnect();
    });

    socket.io.on("reconnect_failed", () => {
        setSocketAuthSuccess(false);
        markSocketDisconnected();
        notifyError("Connexion perdue. Rafraîchissez la page pour continuer.");
    });

    subscribeToSocketEvent("auth_error", ({ error }) => {
        console.error("auth_error", error);
        setSocketAuthSuccess(false);
    });

    subscribeToSocketEvent("auth_success", () => {
        setSocketAuthSuccess(true);

        const user = queryClient.getQueryData<ApiUser>(USER_QUERY_KEY);
        if (user) resyncGameState(user);
    });

    subscribeToSocketEvent("notify_error", (error) => {
        notifyApiError(error);
    });

    subscribeToSocketEvent("notify_success", ({ message }) => {
        notifySuccess(message);
    });

    subscribeToSocketEvent("matchmaking:opponent_waiting", () => {
        if (!shouldShowOpponentWaitingToast()) return;

        notifyOpponentWaiting({ onJoin: () => void joinMatchmakingQueue() });
    });

    subscribeToSocketEvent("matchmaking:opponent_waiting_cancelled", () => {
        dismissOpponentWaitingToast();
    });

    subscribeToSocketEvent("game:created", ({ gameId }) => {
        queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
            if (!oldUser) return oldUser;
            return {
                ...oldUser,
                currentGameId: gameId,
                matchmakingSearchSessionId: null,
            };
        });
        queryClient.setQueryData<ApiGameInvite[]>(GAME_INVITES_QUERY_KEY, []);
        queryClient.setQueryData(SENT_GAME_INVITES_QUERY_KEY, []);
    });

    subscribeToSocketEvent("game:invite_received", ({ invite }) => {
        queryClient.setQueryData<ApiGameInvite[]>(GAME_INVITES_QUERY_KEY, (oldInvites) => {
            const invites = oldInvites ?? [];
            if (invites.some((entry) => entry.id === invite.id)) return invites;
            return [invite, ...invites];
        });
    });

    subscribeToSocketEvent("game:invite_cancelled", ({ inviteId }) => {
        queryClient.setQueryData<ApiGameInvite[]>(GAME_INVITES_QUERY_KEY, (oldInvites) =>
            (oldInvites ?? []).filter((invite) => invite.id !== inviteId),
        );
        queryClient.setQueryData<ApiSentGameInvite[]>(SENT_GAME_INVITES_QUERY_KEY, (oldInvites) =>
            (oldInvites ?? []).filter((invite) => invite.id !== inviteId),
        );
    });

    subscribeToSocketEvent("game:update", ({ game, presentation }) => {
        GAME_STORE.receiveUpdate(game, presentation);

        queryClient.setQueriesData<ApiGame>({ queryKey: ["gameState", game.id] }, (old) => {
            if (!old) return game;
            if (new Date(game.updatedAt).getTime() < new Date(old.updatedAt).getTime()) {
                return old;
            }

            return game;
        });
    });
};
