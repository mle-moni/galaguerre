import { validateResourceId } from "#adomin/routes/validate_resource_id";
import type { ApiGame } from "#api_types/game.types";
import { canSpectateGame } from "#services/friendship/can_spectate_game";
import Game from "#models/game";
import type { HttpContext } from "@adonisjs/core/http";

const parseAsUserId = (value: unknown): number | null => {
    if (value === undefined || value === null || value === "") return null;

    const asUserId = Number(value);

    if (!Number.isFinite(asUserId) || asUserId <= 0 || !Number.isInteger(asUserId)) {
        return null;
    }

    return asUserId;
};

export const showGame = async ({
    params,
    auth,
    request,
    response,
}: HttpContext): Promise<ApiGame | void> => {
    const user = auth.user!;
    const { id: gameId } = await validateResourceId(params);
    const game = await Game.findOrFail(gameId);
    const asUserId = parseAsUserId(request.input("asUserId"));
    const access = await canSpectateGame(user.id, game, asUserId);

    if (!access.allowed) {
        if (access.reason === "view_as_required") {
            return response.badRequest({ error: "Joueur à observer requis" });
        }

        return response.forbidden({ error: "Vous ne pouvez pas regarder cette partie" });
    }

    return game.getApiJson(access.viewAsUserId);
};
