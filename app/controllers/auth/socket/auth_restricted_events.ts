import { passGameTurn } from "#controllers/games/pass_game_turn";
import type { Socket } from "socket.io";

export const joinAuthRestrictedEvents = (socket: Socket) => {
    socket.on("debug", (...data) => {
        socket.emit("debug", ...data);
    });
    socket.on("pass_turn", () => {
        passGameTurn(socket);
    });
};

export const partAuthRestrictedEvents = (socket: Socket) => {
    socket.removeAllListeners("debug");
    socket.removeAllListeners("pass_turn");
};
