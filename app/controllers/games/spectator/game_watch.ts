import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { sendGameUpdate } from "#controllers/games/send_game_update";
import Game from "#models/game";
import { canSpectateGame } from "#services/friendship/can_spectate_game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getSocketDataFromSocketId } from "#services/sockets/sockets_data";
import {
    registerSpectatorWatch,
    unregisterSpectatorWatch,
} from "#services/sockets/spectator_watchers";

export const gameWatch = async (
    socketId: string,
    { gameId, asUserId }: ClientSocketEventByKey["game:watch"],
) => {
    const socketData = getSocketDataFromSocketId(socketId);
    if (!socketData) return;

    const game = await Game.find(gameId);
    if (!game || game.isFinished) {
        emitSocketEvent("notify_error", { error: "Cette partie n'est plus disponible" }, socketId);
        return;
    }

    const access = await canSpectateGame(socketData.userId, game, asUserId);
    if (!access.allowed) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas regarder cette partie" },
            socketId,
        );
        return;
    }

    registerSpectatorWatch(socketData.userId, game.id, access.viewAsUserId);
    sendGameUpdate(game);
};

export const gameUnwatch = async (socketId: string) => {
    const socketData = getSocketDataFromSocketId(socketId);
    if (!socketData) return;

    unregisterSpectatorWatch(socketData.userId);
};
