import type { SocketEventByKey, SocketEventKey } from "#api_types/socket_events";
import { WS } from "./ws_service.js";

export const emitSocketEvent = <T extends SocketEventKey>(
    key: T,
    data: SocketEventByKey[T],
    toRooms: string[] | string,
) => {
    WS.io?.to(toRooms).emit(key, data);
};
