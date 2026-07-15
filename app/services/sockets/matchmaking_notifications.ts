import { emitSocketEvent, emitSocketEventExcept } from "#services/sockets/emit_socket_event";
import { MATCHMAKING_QUEUE } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";

export const canNotifyOpponentWaiting = (searchingUserId: number) => {
    if (MATCHMAKING_QUEUE.length !== 1) return false;

    const loneSearcher = MATCHMAKING_QUEUE[0];
    return loneSearcher?.userId === searchingUserId;
};

export const notifyOpponentWaiting = (searchingUserId: number) => {
    if (!canNotifyOpponentWaiting(searchingUserId)) return;

    emitSocketEventExcept(
        "matchmaking:opponent_waiting",
        {},
        WsRooms.connectedSockets,
        WsRooms.personalSocketRoom(searchingUserId),
    );
};

export const notifyOpponentWaitingCancelledIfQueueEmpty = () => {
    if (MATCHMAKING_QUEUE.length > 0) return;

    emitSocketEvent("matchmaking:opponent_waiting_cancelled", {}, WsRooms.connectedSockets);
};
