import User from "#models/user";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { addSocketData } from "#services/sockets/sockets_data";
import { WsRooms } from "#services/sockets/ws_rooms";
import vine from "@vinejs/vine";
import type { Socket } from "socket.io";
import { joinAuthRestrictedEvents } from "./auth_restricted_events.js";

const BAD_AUTH_REQUEST = `Mauvaises données d'authentification`;

const authSchema = vine.compile(
    vine.object({
        userId: vine.number(),
        socketToken: vine.string(),
    }),
);

export async function socketAuth(socket: Socket, dto: unknown) {
    const [, res] = await authSchema.tryValidate(dto);
    if (res === null) {
        return emitSocketEvent("auth_error", { error: BAD_AUTH_REQUEST }, socket.id);
    }
    const { socketToken, userId } = res;
    const user = await User.find(userId);

    if (user?.socketToken !== socketToken) {
        return emitSocketEvent("auth_error", { error: BAD_AUTH_REQUEST }, socket.id);
    }

    user.socketToken = null;
    await user.save();

    addSocketData(socket.id, userId);
    joinAuthRestrictedEvents(socket);
    socket.join(WsRooms.connectedSockets);
    socket.join(WsRooms.personalSocketRoom(userId));

    emitSocketEvent("auth_success", { message: "Socket connected" }, socket.id);
}
