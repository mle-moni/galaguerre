import type {
    AddFriendPayload,
    AddFriendResponse,
    ApiFriend,
    ApiFriendSearchResult,
    FriendRequestStatus,
} from "#api_types/friend.types";
import FriendRequest from "#models/friend_request";
import Friendship from "#models/friendship";
import User from "#models/user";
import { createMutualFriendship } from "#services/friendship/create_mutual_friendship";
import {
    getCurrentGameIdsByUserId,
    serializeFriend,
} from "#services/friendship/friend_serialization";
import { getMutualFriendIds, isMutualFriend } from "#services/friendship/mutual_friendship";
import type { HttpContext } from "@adonisjs/core/http";
import { addFriendValidator, searchFriendsValidator } from "./friends_validators.js";

const getFriendRequestStatus = (
    userId: number,
    sentRequestUserIds: Set<number>,
    receivedRequestUserIds: Set<number>,
): FriendRequestStatus => {
    if (sentRequestUserIds.has(userId)) return "sent";
    if (receivedRequestUserIds.has(userId)) return "received";
    return "none";
};

export default class FriendsController {
    async index({ auth }: HttpContext): Promise<ApiFriend[]> {
        const friendships = await Friendship.query()
            .where("userId", auth.user!.id)
            .preload("friend")
            .orderBy("createdAt", "desc");

        const friendIds = friendships.map((friendship) => friendship.friendId);
        const mutualFriendIds = await getMutualFriendIds(auth.user!.id, friendIds);
        const currentGameIdsByUserId = await getCurrentGameIdsByUserId([...mutualFriendIds]);

        return friendships
            .filter((friendship) => mutualFriendIds.has(friendship.friendId))
            .map((friendship) =>
                serializeFriend(
                    friendship.friend,
                    currentGameIdsByUserId.get(friendship.friendId) ?? null,
                ),
            );
    }

    async search({ auth, request }: HttpContext): Promise<ApiFriendSearchResult[]> {
        const { q = "" } = await request.validateUsing(searchFriendsValidator);
        const search = q.trim();

        if (search.length < 2) return [];

        const userId = auth.user!.id;
        const friendships = await Friendship.query().where("userId", userId);
        const friendIds = friendships.map((friendship) => friendship.friendId);
        const mutualFriendIds = await getMutualFriendIds(userId, friendIds);
        const users = await User.query()
            .where("id", "!=", userId)
            .whereNotNull("pseudo")
            .whereILike("pseudo", `%${search}%`)
            .orderByRaw("LOWER(pseudo) ASC")
            .orderBy("id", "asc")
            .limit(10);
        const userIds = users.map((user) => user.id);
        const sentRequests = await FriendRequest.query()
            .where("fromUserId", userId)
            .whereIn("toUserId", userIds);
        const receivedRequests = await FriendRequest.query()
            .where("toUserId", userId)
            .whereIn("fromUserId", userIds);
        const sentRequestUserIds = new Set(sentRequests.map((entry) => entry.toUserId));
        const receivedRequestUserIds = new Set(receivedRequests.map((entry) => entry.fromUserId));
        const currentGameIdsByUserId = await getCurrentGameIdsByUserId([...mutualFriendIds]);

        return users.map((user) => ({
            ...serializeFriend(
                user,
                mutualFriendIds.has(user.id) ? currentGameIdsByUserId.get(user.id) ?? null : null,
            ),
            isFriend: mutualFriendIds.has(user.id),
            friendRequestStatus: getFriendRequestStatus(
                user.id,
                sentRequestUserIds,
                receivedRequestUserIds,
            ),
        }));
    }

    async store({ auth, request, response }: HttpContext) {
        const payload = (await request.validateUsing(addFriendValidator)) as AddFriendPayload;
        const userId = auth.user!.id;

        if (payload.friendUserId === userId) {
            return response.badRequest({ error: "Impossible de vous ajouter vous-même" });
        }

        const friend = await User.find(payload.friendUserId);

        if (!friend) return response.notFound({ error: "Utilisateur introuvable" });

        if (await isMutualFriend(userId, friend.id)) {
            return response.badRequest({ error: "Vous êtes déjà amis" });
        }

        const inverseRequest = await FriendRequest.query()
            .where("fromUserId", friend.id)
            .where("toUserId", userId)
            .first();

        if (inverseRequest) {
            await createMutualFriendship(userId, friend.id);
            await inverseRequest.delete();

            const currentGameIdsByUserId = await getCurrentGameIdsByUserId([friend.id]);

            return {
                status: "accepted",
                requestId: null,
                friend: serializeFriend(friend, currentGameIdsByUserId.get(friend.id) ?? null),
            } satisfies AddFriendResponse;
        }

        const existingRequest = await FriendRequest.query()
            .where("fromUserId", userId)
            .where("toUserId", friend.id)
            .first();

        if (existingRequest) {
            return {
                status: "sent",
                requestId: existingRequest.id,
                friend: null,
            } satisfies AddFriendResponse;
        }

        const friendRequest = await FriendRequest.create({
            fromUserId: userId,
            toUserId: friend.id,
        });

        return {
            status: "sent",
            requestId: friendRequest.id,
            friend: null,
        } satisfies AddFriendResponse;
    }

    async destroy({ auth, params, response }: HttpContext) {
        const friendUserId = Number(params.friendUserId);

        if (!Number.isFinite(friendUserId) || friendUserId <= 0) {
            return response.badRequest({ error: "Ami invalide" });
        }

        const userId = auth.user!.id;

        await Friendship.query().where("userId", userId).where("friendId", friendUserId).delete();
        await Friendship.query().where("userId", friendUserId).where("friendId", userId).delete();

        return { message: "Ami retiré" };
    }
}
