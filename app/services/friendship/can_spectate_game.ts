import type Game from "#models/game";
import { getMutualFriendIds, isMutualFriend } from "./mutual_friendship.js";

export type SpectateAccess =
    | { allowed: true; viewAsUserId: number }
    | { allowed: false; reason: "forbidden" | "view_as_required" };

const getPlayerIds = (game: Game): number[] =>
    [game.playerOneId, game.playerTwoId].filter(
        (playerId): playerId is number => playerId !== null,
    );

export const canSpectateGame = async (
    spectatorId: number,
    game: Game,
    asUserId: number | null,
): Promise<SpectateAccess> => {
    const playerIds = getPlayerIds(game);

    if (playerIds.includes(spectatorId)) {
        return { allowed: true, viewAsUserId: spectatorId };
    }

    if (playerIds.length === 0) {
        return { allowed: false, reason: "forbidden" };
    }

    let viewAsUserId = asUserId;

    if (viewAsUserId === null) {
        const mutualPlayerIds = await getMutualFriendIds(spectatorId, playerIds);

        if (mutualPlayerIds.size === 1) {
            viewAsUserId = [...mutualPlayerIds][0]!;
        } else {
            return { allowed: false, reason: "view_as_required" };
        }
    }

    if (!playerIds.includes(viewAsUserId)) {
        return { allowed: false, reason: "forbidden" };
    }

    if (!(await isMutualFriend(spectatorId, viewAsUserId))) {
        return { allowed: false, reason: "forbidden" };
    }

    return { allowed: true, viewAsUserId };
};
