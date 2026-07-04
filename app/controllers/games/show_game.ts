import { validateResourceId } from "#adomin/routes/validate_resource_id";
import { canSpectateGame } from "#services/friendship/can_spectate_game";
import Game from "#models/game";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";

export const showGameQueryValidator = vine.create({
    asUserId: vine.number().optional(),
});

export const showGame = async (
    { params, auth, response }: HttpContext,
    asUserId: number | undefined,
) => {
    const user = auth.user!;
    const { id: gameId } = await validateResourceId(params);
    const game = await Game.findOrFail(gameId);
    const normalizedAsUserId =
        asUserId !== undefined && Number.isFinite(asUserId) && asUserId > 0 ? asUserId : null;
    const access = await canSpectateGame(user.id, game, normalizedAsUserId);

    if (!access.allowed) {
        if (access.reason === "view_as_required") {
            return response.badRequest({ error: "Joueur à observer requis" });
        }

        return response.forbidden({ error: "Vous ne pouvez pas regarder cette partie" });
    }

    return game.getApiJson(access.viewAsUserId);
};
