import type { Socket } from "socket.io";

export const joinAuthRestrictedEvents = (socket: Socket) => {
    socket.on("debug", (...data) => {
        socket.emit("debug", ...data);
    });
};

export const partAuthRestrictedEvents = (socket: Socket) => {
    socket.removeAllListeners("debug");
};
