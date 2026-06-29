import { validateResourceId } from "#adomin/routes/validate_resource_id";
import type { ApiGame } from "#api_types/game.types";
import Friendship from "#models/friendship";
import Game from "#models/game";
import type { HttpContext } from "@adonisjs/core/http";

const canSpectateGame = async (userId: number, game: Game): Promise<boolean> => {
    const playerIds = [game.playerOneId, game.playerTwoId].filter(
        (playerId): playerId is number => playerId !== null,
    );

    if (playerIds.includes(userId)) return true;
    if (playerIds.length === 0) return false;

    const friendship = await Friendship.query()
        .where("userId", userId)
        .whereIn("friendId", playerIds)
        .first();

    return !!friendship;
};

export const showGame = async ({
    params,
    auth,
    response,
}: HttpContext): Promise<ApiGame | void> => {
    const user = auth.user!;
    const { id: gameId } = await validateResourceId(params);
    const game = await Game.findOrFail(gameId);

    if (!(await canSpectateGame(user.id, game))) {
        return response.forbidden({ error: "Vous ne pouvez pas regarder cette partie" });
    }

    return game.getApiJson(user.id);
};
