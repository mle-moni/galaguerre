import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import type { Socket } from "socket.io-client";
import { getGameStateQueryKey } from "~/hooks/use_game_state";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { queryClient } from "./query_client.js";
import { notifyApiError, notifySuccess } from "./toasts.js";
import { setSocketAuthSuccess, subscribeToSocketEvent } from "./ws_client.js";

export const setupEvents = (socket: Socket) => {
    socket.on("error", (error) => {
        console.error(error);
    });

    socket.on("debug", (...data) => {
        console.info("debug", ...data);
    });

    subscribeToSocketEvent("auth_error", ({ error }) => {
        console.error("auth_error", error);
        setSocketAuthSuccess(false);
    });

    subscribeToSocketEvent("auth_success", () => {
        setSocketAuthSuccess(true);
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
            if (!old) return old;

            return game;
        });
    });
};
