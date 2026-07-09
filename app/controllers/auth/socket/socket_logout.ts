import {
    removeMatchmakingImmediately,
    scheduleMatchmakingRemoval,
} from "#services/sockets/matchmaking";
import { scheduleInviteeInviteRemoval } from "#services/game_invites/invite_disconnect_grace";
import { getSocketDataFromSocketId, removeSocketData } from "#services/sockets/sockets_data";
import { unregisterSpectatorWatch } from "#services/sockets/spectator_watchers";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { Socket } from "socket.io";
import { partAuthRestrictedEvents } from "./auth_restricted_events.js";

export async function socketLogout(socket: Socket, options: { immediate?: boolean } = {}) {
    socket.leave(WsRooms.connectedSockets);
    partAuthRestrictedEvents(socket);
    const socketData = getSocketDataFromSocketId(socket.id);
    if (socketData) {
        unregisterSpectatorWatch(socketData.userId);
        if (options.immediate) {
            removeMatchmakingImmediately(socketData.userId);
        } else {
            scheduleMatchmakingRemoval(socketData.userId);
            scheduleInviteeInviteRemoval(socketData.userId);
        }
    }
    removeSocketData(socket.id);
}
