import type { GameSearchHeartbeatResponse } from "#api_types/matchmaking.types";
import { findActiveGameForUser } from "#controllers/games/game_utils";
import { findQueueItemByUserId, touchHeartbeat } from "#services/sockets/matchmaking";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";

const heartbeatSchema = vine.compile(
    vine.object({
        searchSessionId: vine.string(),
    }),
);

export const gameSearchHeartbeat = async ({ auth, request, response }: HttpContext) => {
    const user = auth.user!;
    const [errors, body] = await heartbeatSchema.tryValidate(request.body());

    if (errors) {
        return response.badRequest({ error: "searchSessionId is required" });
    }

    const currentGame = await findActiveGameForUser(user.id);
    if (currentGame) {
        const result: GameSearchHeartbeatResponse = {
            status: "matched",
            gameId: currentGame.id,
        };
        return result;
    }

    const item = touchHeartbeat(body.searchSessionId);
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
