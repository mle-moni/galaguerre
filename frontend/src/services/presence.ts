import { client } from "./client.js";

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 30_000;

export const sendPresenceHeartbeat = async () => {
    return client.api.presence.heartbeat({});
};
