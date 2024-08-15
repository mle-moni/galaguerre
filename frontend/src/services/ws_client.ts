import type { ApiUser } from "#api_types/auth.types";
import { io } from "socket.io-client";

let authSuccess = false;

export const CLIENT_SOCKET = io("/", {
    transports: ["websocket"],
});

export const authenticateSocket = (user: ApiUser) => {
    if (authSuccess) return;

    CLIENT_SOCKET.emit("auth", { socketToken: user.socketToken, userId: user.id });
};

CLIENT_SOCKET.on("error", (error) => {
    console.error(error);
});

CLIENT_SOCKET.on("auth_error", (error) => {
    console.log("auth_error", error);
    authSuccess = false;
});

CLIENT_SOCKET.on("auth_success", () => {
    authSuccess = true;
});

CLIENT_SOCKET.on("debug", (...data) => {
    console.log("debug", ...data);
});
