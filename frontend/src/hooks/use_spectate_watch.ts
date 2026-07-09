import { useCallback, useEffect } from "react";
import {
    emitSocketEventToServer,
    isSocketReady,
    subscribeConnectionStatus,
} from "~/services/ws_client";

export const useSpectateWatch = (gameId: number, asUserId: number, enabled = true) => {
    const emitWatch = useCallback(() => {
        if (!enabled || !isSocketReady()) return;

        emitSocketEventToServer("game:watch", { gameId, asUserId });
    }, [asUserId, enabled, gameId]);

    useEffect(() => {
        if (!enabled) return;

        emitWatch();
        const unsubscribe = subscribeConnectionStatus(emitWatch);

        return () => {
            unsubscribe();
            if (isSocketReady()) {
                emitSocketEventToServer("game:unwatch", {});
            }
        };
    }, [emitWatch, enabled]);
};
