import { removeMatchmakingQueueItem } from "#services/sockets/matchmaking";
import { getSocketDataFromSocketId, removeSocketData } from "#services/sockets/sockets_data";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { Socket } from "socket.io";
import { partAuthRestrictedEvents } from "./auth_restricted_events.js";

export async function socketLogout(socket: Socket) {
    socket.leave(WsRooms.connectedSockets);
    partAuthRestrictedEvents(socket);
    const socketData = getSocketDataFromSocketId(socket.id);
    if (socketData) removeMatchmakingQueueItem(socketData.userId);
    removeSocketData(socket.id);
}
