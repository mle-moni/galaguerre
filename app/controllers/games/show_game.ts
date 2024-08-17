import { validateResourceId } from "#adomin/routes/validate_resource_id";
import type { ApiGame } from "#api_types/game.types";
import Game from "#models/game";
import type { HttpContext } from "@adonisjs/core/http";

export const showGame = async ({ params, auth }: HttpContext): Promise<ApiGame> => {
    const user = auth.user!;
    const { id: gameId } = await validateResourceId(params);
    const game = await Game.findOrFail(gameId);

    return game.getApiJson(user.id);
};
