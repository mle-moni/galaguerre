import type { ApiGameInvite, ApiSentGameInvite } from "#api_types/game_invite.types";
import GameInvite from "#models/game_invite";
import { acceptGameInvite } from "#services/game_invites/accept_game_invite";
import {
    cancelInviteById,
    serializeIncomingGameInvite,
    serializeSentGameInvite,
} from "#services/game_invites/cancel_game_invites";
import { createGameInvite, GameInviteError } from "#services/game_invites/create_game_invite";
import type { HttpContext } from "@adonisjs/core/http";
import { createGameInviteValidator } from "./game_invite_validators.js";

const handleGameInviteError = (error: unknown, response: HttpContext["response"]) => {
    if (error instanceof GameInviteError) {
        if (error.statusCode === 404) {
            return response.notFound({ error: error.message });
        }
        if (error.statusCode === 403) {
            return response.forbidden({ error: error.message });
        }
        return response.badRequest({ error: error.message });
    }

    throw error;
};

export default class GameInvitesController {
    async index({ auth }: HttpContext): Promise<ApiGameInvite[]> {
        const invites = await GameInvite.query()
            .where("toUserId", auth.user!.id)
            .preload("fromUser")
            .orderBy("createdAt", "desc");

        return invites.map(serializeIncomingGameInvite);
    }

    async sent({ auth }: HttpContext): Promise<ApiSentGameInvite[]> {
        const invite = await GameInvite.query()
            .where("fromUserId", auth.user!.id)
            .preload("toUser")
            .first();

        return invite ? [serializeSentGameInvite(invite)] : [];
    }

    async store({ auth, request, response }: HttpContext) {
        const { toUserId } = await request.validateUsing(createGameInviteValidator);

        try {
            const invite = await createGameInvite(auth.user!.id, toUserId);
            return { invite };
        } catch (error) {
            return handleGameInviteError(error, response);
        }
    }

    async accept({ auth, params, response }: HttpContext) {
        const inviteId = Number(params.id);

        if (!Number.isFinite(inviteId) || inviteId <= 0) {
            return response.badRequest({ error: "Invitation invalide" });
        }

        try {
            return await acceptGameInvite(inviteId, auth.user!.id);
        } catch (error) {
            return handleGameInviteError(error, response);
        }
    }

    async destroy({ auth, params, response }: HttpContext) {
        const inviteId = Number(params.id);

        if (!Number.isFinite(inviteId) || inviteId <= 0) {
            return response.badRequest({ error: "Invitation invalide" });
        }

        const invite = await GameInvite.query().where("id", inviteId).first();

        if (!invite) {
            return response.notFound({ error: "Invitation introuvable" });
        }

        const userId = auth.user!.id;

        if (invite.toUserId !== userId && invite.fromUserId !== userId) {
            return response.forbidden({ error: "Action non autorisée" });
        }

        await cancelInviteById(invite.id);

        return { message: "Invitation supprimée" };
    }
}
