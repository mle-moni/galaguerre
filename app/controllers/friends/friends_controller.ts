import type { AddFriendPayload, ApiFriend, ApiFriendSearchResult } from "#api_types/friend.types";
import Friendship from "#models/friendship";
import User from "#models/user";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";

const addFriendValidator = vine.compile(
    vine.object({
        friendUserId: vine.number().withoutDecimals().positive(),
    }),
);

const serializeFriend = (user: User): ApiFriend => ({
    userId: user.id,
    pseudo: user.pseudo,
    elo: user.elo,
    wins: user.wins,
    losses: user.losses,
});

export default class FriendsController {
    async index({ auth }: HttpContext): Promise<ApiFriend[]> {
        const friendships = await Friendship.query()
            .where("userId", auth.user!.id)
            .preload("friend")
            .orderBy("createdAt", "desc");

        return friendships.map((friendship) => serializeFriend(friendship.friend));
    }

    async search({ auth, request }: HttpContext): Promise<ApiFriendSearchResult[]> {
        const search = String(request.input("q", "")).trim();

        if (search.length < 2) return [];

        const userId = auth.user!.id;
        const friendships = await Friendship.query().where("userId", userId);
        const friendIds = new Set(friendships.map((friendship) => friendship.friendId));
        const users = await User.query()
            .where("id", "!=", userId)
            .whereNotNull("pseudo")
            .whereILike("pseudo", `%${search}%`)
            .orderByRaw("LOWER(pseudo) ASC")
            .orderBy("id", "asc")
            .limit(10);

        return users.map((user) => ({
            ...serializeFriend(user),
            isFriend: friendIds.has(user.id),
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

        await Friendship.firstOrCreate(
            { userId, friendId: payload.friendUserId },
            { userId, friendId: payload.friendUserId },
        );

        return serializeFriend(friend);
    }

    async destroy({ auth, params, response }: HttpContext) {
        const friendUserId = Number(params.friendUserId);

        if (!Number.isFinite(friendUserId) || friendUserId <= 0) {
            return response.badRequest({ error: "Ami invalide" });
        }

        await Friendship.query()
            .where("userId", auth.user!.id)
            .where("friendId", friendUserId)
            .delete();

        return { message: "Ami retiré" };
    }
}
