import Friendship from "#models/friendship";

export const createMutualFriendship = async (userAId: number, userBId: number): Promise<void> => {
    await Friendship.firstOrCreate(
        { userId: userAId, friendId: userBId },
        { userId: userAId, friendId: userBId },
    );
    await Friendship.firstOrCreate(
        { userId: userBId, friendId: userAId },
        { userId: userBId, friendId: userAId },
    );
};
