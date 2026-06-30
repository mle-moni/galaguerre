import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";

export const ensureNoPendingDiscover = (game: Game, socketId: string, userId: number): boolean => {
    const pending = game.data.pendingDiscover;
    if (!pending) return true;

    if (pending.playerUserId === userId) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous devez d'abord terminer votre découverte" },
            socketId,
        );
        return false;
    }

    emitSocketEvent(
        "notify_error",
        { error: "En attente de la découverte de l'adversaire" },
        socketId,
    );
    return false;
};
