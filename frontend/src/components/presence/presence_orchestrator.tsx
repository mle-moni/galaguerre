import { usePresenceHeartbeat } from "~/hooks/use_presence_heartbeat";

export const PresenceOrchestrator = () => {
    usePresenceHeartbeat();
    return null;
};
