import {
    removeMatchmakingImmediately,
    scheduleMatchmakingRemoval,
} from "#services/sockets/matchmaking";
import { getSocketDataFromSocketId, removeSocketData } from "#services/sockets/sockets_data";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { Socket } from "socket.io";
import { partAuthRestrictedEvents } from "./auth_restricted_events.js";

export async function socketLogout(socket: Socket, options: { immediate?: boolean } = {}) {
    socket.leave(WsRooms.connectedSockets);
    partAuthRestrictedEvents(socket);
    const socketData = getSocketDataFromSocketId(socket.id);
    if (socketData) {
        if (options.immediate) {
            removeMatchmakingImmediately(socketData.userId);
        } else {
            scheduleMatchmakingRemoval(socketData.userId);
        }
    }
    removeSocketData(socket.id);
}
