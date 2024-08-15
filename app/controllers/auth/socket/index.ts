import type { Socket } from "socket.io";
import { socketAuth } from "./socket_auth.js";
import { socketLogout } from "./socket_logout.js";

export function initSockerAuthController(socket: Socket) {
    socket.on("auth", (dto: unknown) => socketAuth(socket, dto));
    socket.on("logout", () => socketLogout(socket));
}
