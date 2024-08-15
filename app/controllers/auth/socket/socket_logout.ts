import { WsRooms } from "#services/sockets/ws_rooms";
import type { Socket } from "socket.io";
import { partAuthRestrictedEvents } from "./auth_restricted_events.js";

export async function socketLogout(socket: Socket) {
    socket.leave(WsRooms.connectedSockets);
    partAuthRestrictedEvents(socket);
}
