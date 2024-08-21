import type {
    ClientSocketEventByKey,
    ClientSocketEventKey,
    SocketEventByKey,
    SocketEventKey,
} from "#api_types/socket_events";
import vine, { type VineObject } from "@vinejs/vine";
import type { Socket } from "socket.io";
import { WS } from "./ws_service.js";

export const emitSocketEvent = <T extends SocketEventKey>(
    key: T,
    data: SocketEventByKey[T],
    toRooms: string[] | string,
) => {
    WS.io?.to(toRooms).emit(key, data);
};

export const subscribeToClientSocketEvent = <T extends ClientSocketEventKey>(
    socket: Socket,
    key: T,
    callback: (data: ClientSocketEventByKey[T]) => void,
    /**
     * You must provide a vine object that matches the data you will receive in the callback
     */
    validation: VineObject<
        any,
        ClientSocketEventByKey[T],
        ClientSocketEventByKey[T],
        ClientSocketEventByKey[T]
    >,
) => {
    const schema = vine.compile(validation);
    const keyAsString: string = key;
    socket.on(keyAsString, (data) => {
        schema
            .validate(data)
            .then((res) => callback(res))
            .catch(() => {
                emitSocketEvent(
                    "notify_error",
                    { error: `Invalid data sent for event '${key}' :/` },
                    socket.id,
                );
            });
    });
};
