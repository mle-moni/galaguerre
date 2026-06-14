import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import type { Socket } from "socket.io-client";
import { getGameStateQueryKey } from "~/hooks/use_game_state";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { fetchCurrentUser } from "./fetch_current_user.js";
import { queryClient } from "./query_client.js";
import { notifyApiError, notifyError, notifySuccess } from "./toasts.js";
import {
    markSocketDisconnected,
    markSocketReconnecting,
    reauthenticateSocket,
    setSocketAuthSuccess,
    subscribeToSocketEvent,
} from "./ws_client.js";

let isReauthenticating = false;

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

    subscribeToSocketEvent("game:created", ({ gameId }) => {
        queryClient.setQueryData<ApiUser | null>(USER_QUERY_KEY, (oldUser) => {
            if (!oldUser) return oldUser;
            return { ...oldUser, currentGameId: gameId };
        });
    });

    subscribeToSocketEvent("game:update", ({ game }) => {
        queryClient.setQueryData<ApiGame>(getGameStateQueryKey(game.id), (old) => {
            if (!old) return game;
            if (new Date(game.updatedAt).getTime() < new Date(old.updatedAt).getTime()) {
                return old;
            }

            return game;
        });
    });
};
