import Friendship from "#models/friendship";

export const isMutualFriend = async (userAId: number, userBId: number): Promise<boolean> => {
    const [aToB, bToA] = await Promise.all([
        Friendship.query().where("userId", userAId).where("friendId", userBId).first(),
        Friendship.query().where("userId", userBId).where("friendId", userAId).first(),
    ]);

    return !!aToB && !!bToA;
};

export const getMutualFriendIds = async (
    userId: number,
    candidateIds: number[],
): Promise<Set<number>> => {
    if (candidateIds.length === 0) return new Set();

    const outgoing = await Friendship.query()
        .where("userId", userId)
        .whereIn("friendId", candidateIds);
    const outgoingIds = outgoing.map((friendship) => friendship.friendId);

    if (outgoingIds.length === 0) return new Set();

    const incoming = await Friendship.query()
        .whereIn("userId", outgoingIds)
        .where("friendId", userId);
    const incomingIds = new Set(incoming.map((friendship) => friendship.userId));

    return new Set(outgoingIds.filter((friendId) => incomingIds.has(friendId)));
};
