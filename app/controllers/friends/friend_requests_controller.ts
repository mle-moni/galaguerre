import type { ApiFriend, ApiFriendRequest, ApiSentFriendRequest } from "#api_types/friend.types";
import FriendRequest from "#models/friend_request";
import { createMutualFriendship } from "#services/friendship/create_mutual_friendship";
import { getCurrentGameIdsByUserId } from "#services/friendship/friend_serialization";
import { serializeFriend } from "#services/friendship/friend_serialization";
import type { HttpContext } from "@adonisjs/core/http";

const serializeIncomingRequest = (request: FriendRequest): ApiFriendRequest => ({
    id: request.id,
    fromUserId: request.fromUserId,
    fromPseudo: request.fromUser.pseudo,
    createdAt: request.createdAt.toISO()!,
});

const serializeSentRequest = (request: FriendRequest): ApiSentFriendRequest => ({
    id: request.id,
    toUserId: request.toUserId,
    toPseudo: request.toUser.pseudo,
    createdAt: request.createdAt.toISO()!,
});

export default class FriendRequestsController {
    async index({ auth }: HttpContext): Promise<ApiFriendRequest[]> {
        const requests = await FriendRequest.query()
            .where("toUserId", auth.user!.id)
            .preload("fromUser")
            .orderBy("createdAt", "desc");

        return requests.map(serializeIncomingRequest);
    }

    async sent({ auth }: HttpContext): Promise<ApiSentFriendRequest[]> {
        const requests = await FriendRequest.query()
            .where("fromUserId", auth.user!.id)
            .preload("toUser")
            .orderBy("createdAt", "desc");

        return requests.map(serializeSentRequest);
    }

    async accept({ auth, params, response }: HttpContext) {
        const requestId = Number(params.id);

        if (!Number.isFinite(requestId) || requestId <= 0) {
            return response.badRequest({ error: "Demande invalide" });
        }

        const friendRequest = await FriendRequest.query()
            .where("id", requestId)
            .where("toUserId", auth.user!.id)
            .preload("fromUser")
            .first();

        if (!friendRequest) {
            return response.notFound({ error: "Demande introuvable" });
        }

        await createMutualFriendship(auth.user!.id, friendRequest.fromUserId);
        await friendRequest.delete();

        const currentGameIdsByUserId = await getCurrentGameIdsByUserId([friendRequest.fromUserId]);

        return serializeFriend(
            friendRequest.fromUser,
            currentGameIdsByUserId.get(friendRequest.fromUserId) ?? null,
        ) satisfies ApiFriend;
    }

    async destroy({ auth, params, response }: HttpContext) {
        const requestId = Number(params.id);

        if (!Number.isFinite(requestId) || requestId <= 0) {
            return response.badRequest({ error: "Demande invalide" });
        }

        const friendRequest = await FriendRequest.query().where("id", requestId).first();

        if (!friendRequest) {
            return response.notFound({ error: "Demande introuvable" });
        }

        const userId = auth.user!.id;

        if (friendRequest.toUserId !== userId && friendRequest.fromUserId !== userId) {
            return response.forbidden({ error: "Action non autorisée" });
        }

        await friendRequest.delete();

        return { message: "Demande supprimée" };
    }
}
