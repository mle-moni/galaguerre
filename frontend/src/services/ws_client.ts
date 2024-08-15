import type { ApiUser } from "#api_types/auth.types";
import type { SocketEventByKey, SocketEventKey } from "#api_types/socket_events";
import { io } from "socket.io-client";
import { setupEvents } from "./ws_events.js";

let authSuccess = false;

export const CLIENT_SOCKET = io("/", {
    transports: ["websocket"],
});

export const authenticateSocket = (user: ApiUser) => {
    if (authSuccess) return;

    CLIENT_SOCKET.emit("auth", { socketToken: user.socketToken, userId: user.id });
};

export const setSocketAuthSuccess = (success: boolean) => {
    authSuccess = success;
};

export const subscribeToSocketEvent = <T extends SocketEventKey>(
    key: T,
    callback: (data: SocketEventByKey[T]) => void,
) => {
    CLIENT_SOCKET.on(key, callback as never);
};

setupEvents(CLIENT_SOCKET);
