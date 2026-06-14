import { useSyncExternalStore } from "react";
import {
    getConnectionStatus,
    isSocketReady,
    subscribeConnectionStatus,
} from "~/services/ws_client";

const getServerConnectionStatus = () => "reconnecting" as const;
const getServerSocketReady = () => false;

export const useSocketConnectionStatus = () => {
    return useSyncExternalStore(
        subscribeConnectionStatus,
        getConnectionStatus,
        getServerConnectionStatus,
    );
};

export const useIsSocketReady = () => {
    return useSyncExternalStore(subscribeConnectionStatus, isSocketReady, getServerSocketReady);
};
