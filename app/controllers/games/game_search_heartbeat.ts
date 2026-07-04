import type { GameSearchHeartbeatResponse } from "#api_types/matchmaking.types";
import { findActiveGameForUser } from "#controllers/games/game_utils";
import { findQueueItemByUserId, touchHeartbeat } from "#services/sockets/matchmaking";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";

export const heartbeatSchema = vine.create({
    searchSessionId: vine.string(),
});

export const gameSearchHeartbeat = async ({ auth }: HttpContext, searchSessionId: string) => {
    const user = auth.user!;

    const currentGame = await findActiveGameForUser(user.id);
    if (currentGame) {
        const result: GameSearchHeartbeatResponse = {
            status: "matched",
            gameId: currentGame.id,
        };
        return result;
    }

    const item = touchHeartbeat(searchSessionId);
    if (!item || item.userId !== user.id) {
        const result: GameSearchHeartbeatResponse = { status: "idle" };
        return result;
    }

    if (!findQueueItemByUserId(user.id)) {
        const result: GameSearchHeartbeatResponse = { status: "idle" };
        return result;
    }

    const result: GameSearchHeartbeatResponse = { status: "searching" };
    return result;
};
