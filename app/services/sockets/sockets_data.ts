import { WsRooms } from "./ws_rooms.js";

export interface SocketData {
    userId: number;
    socketId: string;
    gameId?: number;
}

// map that allows to get socket data from socket id or user id
export const SOCKET_DATA = new Map<string, SocketData>();

export const addSocketData = (socketId: string, userId: number) => {
    const socketData: SocketData = { userId, socketId };
    const userIdString = WsRooms.personalSocketRoom(userId);

    SOCKET_DATA.set(socketId, socketData);
    SOCKET_DATA.set(userIdString, socketData);
};

export const addAiSocketData = (socketId: string, userId: number, gameId: number) => {
    const socketData: SocketData = { userId, socketId, gameId };
    SOCKET_DATA.set(socketId, socketData);
};

export const removeSocketData = (socketId: string) => {
    const found = SOCKET_DATA.get(socketId);

    if (!found) return;

    SOCKET_DATA.delete(socketId);

    if (found.gameId === undefined) {
        const userIdString = WsRooms.personalSocketRoom(found.userId);
        SOCKET_DATA.delete(userIdString);
    }
};

export const getSocketDataFromUserId = (userId: number) => {
    const userSocketString = WsRooms.personalSocketRoom(userId);
    const socketData = SOCKET_DATA.get(userSocketString);

    return socketData ?? null;
};

export const getSocketDataFromSocketId = (socketId: string) => {
    const socketData = SOCKET_DATA.get(socketId);

    return socketData ?? null;
};
