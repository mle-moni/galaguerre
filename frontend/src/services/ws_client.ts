import type { ApiUser } from "#api_types/auth.types";
import type {
    ClientSocketEventByKey,
    ClientSocketEventKey,
    SocketEventByKey,
    SocketEventKey,
} from "#api_types/socket_events";
import { io } from "socket.io-client";
import { notifyError } from "./toasts.js";
import { setupEvents } from "./ws_events.js";

export type SocketConnectionStatus = "connected" | "reconnecting" | "disconnected";

let authSuccess = false;
let connectionStatus: SocketConnectionStatus = "reconnecting";
const connectionStatusListeners = new Set<() => void>();

const notifyConnectionListeners = () => {
    for (const listener of connectionStatusListeners) {
        listener();
    }
};

const setConnectionStatus = (status: SocketConnectionStatus) => {
    if (connectionStatus === status) return;

    connectionStatus = status;
    notifyConnectionListeners();
};

export const subscribeConnectionStatus = (listener: () => void) => {
    connectionStatusListeners.add(listener);

    return () => {
        connectionStatusListeners.delete(listener);
    };
};

export const getConnectionStatus = () => connectionStatus;

export const isSocketAuthenticated = () => authSuccess;

export const isSocketReady = () => CLIENT_SOCKET.connected && authSuccess;

export const CLIENT_SOCKET = io("/", {
    transports: ["websocket"],
});

const ensureSocketConnected = () => {
    if (!CLIENT_SOCKET.connected) {
        CLIENT_SOCKET.connect();
    }
};

export const authenticateSocket = (user: ApiUser) => {
    ensureSocketConnected();

    if (authSuccess) return;

    CLIENT_SOCKET.emit("auth", { socketToken: user.socketToken, userId: user.id });
};

export const reauthenticateSocket = (user: ApiUser) => {
    ensureSocketConnected();

    CLIENT_SOCKET.emit("auth", { socketToken: user.socketToken, userId: user.id });
};

export const setSocketAuthSuccess = (success: boolean) => {
    const wasAuthenticated = authSuccess;
    authSuccess = success;

    if (success && CLIENT_SOCKET.connected) {
        setConnectionStatus("connected");
        return;
    }

    if (wasAuthenticated !== success) {
        notifyConnectionListeners();
    }
};

export const markSocketReconnecting = () => {
    setConnectionStatus("reconnecting");
};

export const markSocketDisconnected = () => {
    setConnectionStatus("disconnected");
};

export const subscribeToSocketEvent = <T extends SocketEventKey>(
    key: T,
    callback: (data: SocketEventByKey[T]) => void,
) => {
    CLIENT_SOCKET.on(key, callback as never);
};

setupEvents(CLIENT_SOCKET);

export const passTurn = () => {
    if (!isSocketReady()) {
        notifyError("Connexion perdue, reconnexion en cours...");
        return;
    }

    CLIENT_SOCKET.emit("pass_turn");
};

export const abandonGame = () => {
    emitSocketEventToServer("game:abandon", {});
};

export const emitSocketEventToServer = <T extends ClientSocketEventKey>(
    key: T,
    data: ClientSocketEventByKey[T],
) => {
    if (!isSocketReady()) {
        notifyError("Connexion perdue, reconnexion en cours...");
        return;
    }

    CLIENT_SOCKET.emit(key, data);
};
