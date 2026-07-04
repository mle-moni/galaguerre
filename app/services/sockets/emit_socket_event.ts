import type {
    ClientSocketEventByKey,
    ClientSocketEventKey,
    SocketEventByKey,
    SocketEventKey,
} from "#api_types/socket_events";
import logger from "@adonisjs/core/services/logger";
import { type VineValidator } from "@vinejs/vine";
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
    callback: (data: ClientSocketEventByKey[T]) => Promise<void>,
    /**
     * You must provide a vine schema that matches the data you will receive in the callback
     */
    validation: VineValidator<any, any>,
) => {
    const keyAsString: string = key;
    socket.on(keyAsString, (data) => {
        validation
            .validate(data)
            .then((res) =>
                callback(res).catch((e) => {
                    logger.error(`Error in callback for ${key}`);
                    logger.error(e);
                }),
            )
            .catch(() => {
                emitSocketEvent(
                    "notify_error",
                    { error: `Invalid data sent for event '${key}' :/` },
                    socket.id,
                );
            });
    });
};
