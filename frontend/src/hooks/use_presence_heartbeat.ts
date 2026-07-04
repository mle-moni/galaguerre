import { useEffect } from "react";
import { PRESENCE_HEARTBEAT_INTERVAL_MS, sendPresenceHeartbeat } from "~/services/presence";
import { useUser } from "./use_user.js";

export const usePresenceHeartbeat = () => {
    const user = useUser();

    useEffect(() => {
        if (!user) return;

        const sendHeartbeat = async () => {
            try {
                await sendPresenceHeartbeat();
            } catch {
                // Ignore transient heartbeat errors; next tick will retry.
            }
        };

        void sendHeartbeat();

        const interval = setInterval(() => {
            void sendHeartbeat();
        }, PRESENCE_HEARTBEAT_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void sendHeartbeat();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [user]);
};
