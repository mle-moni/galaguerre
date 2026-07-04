import User from "#models/user";
import { cancelAllInvitesForUser } from "#services/game_invites/cancel_game_invites";
import type { HttpContext } from "@adonisjs/core/http";

export const adominLogout = async ({ auth }: HttpContext) => {
    const user = auth.user;
    if (!user) return { message: "Au revoir !" };

    await cancelAllInvitesForUser(user.id);

    const currentToken = auth.user.currentAccessToken;
    await User.accessTokens.delete(user, currentToken.identifier);

    return { message: "Au revoir !" };
};
