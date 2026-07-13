import Game from "#models/game";
import User from "#models/user";
import { getProgressionFromTotalXp } from "#api_types/progression";
import { isUserOnline } from "#services/presence/presence";

export const getCurrentGameIdsByUserId = async (
    userIds: number[],
): Promise<Map<number, number>> => {
    if (userIds.length === 0) return new Map();

    const games = await Game.query()
        .where("isFinished", false)
        .where((query) => {
            query.whereIn("playerOneId", userIds).orWhereIn("playerTwoId", userIds);
        });
    const currentGameIdsByUserId = new Map<number, number>();

    for (const game of games) {
        if (game.playerOneId && userIds.includes(game.playerOneId)) {
            currentGameIdsByUserId.set(game.playerOneId, game.id);
        }
        if (game.playerTwoId && userIds.includes(game.playerTwoId)) {
            currentGameIdsByUserId.set(game.playerTwoId, game.id);
        }
    }

    return currentGameIdsByUserId;
};

export const serializeFriend = (user: User, currentGameId: number | null = null) => {
    const progression = getProgressionFromTotalXp(user.xp);

    return {
        userId: user.id,
        pseudo: user.pseudo,
        avatarCardId: user.avatarCardId,
        elo: user.elo,
        wins: user.wins,
        losses: user.losses,
        level: progression.level,
        levelTitle: progression.levelTitle,
        currentGameId,
        lastSeenAt: user.lastSeenAt?.toISO() ?? null,
        isOnline: isUserOnline(user.lastSeenAt),
    };
};
