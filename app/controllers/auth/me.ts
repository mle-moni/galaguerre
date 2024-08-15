import type { ApiUser } from "#api_types/auth.types";
import Game from "#models/game";
import { cuid } from "@adonisjs/core/helpers";
import type { HttpContext } from "@adonisjs/core/http";

// biome-ignore lint/suspicious/noConfusingVoidType:
export const me = async ({ auth, response }: HttpContext): Promise<ApiUser | void> => {
    const user = auth.user;

    if (!user) return response.unauthorized({ error: "Vous n'êtes pas connecté" });

    const currentGame = await Game.query()
        .where((q) => q.where("playerOneId", user.id).orWhere("playerTwoId", user.id))
        .andWhere("isFinished", false)
        .first();

    user.socketToken = cuid();

    await user.save();

    return {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        socketToken: user.socketToken,
        currentGameId: currentGame?.id ?? null,
    };
};
