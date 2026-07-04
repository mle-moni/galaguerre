import { getProgressionFromTotalXp } from "#api_types/progression";
import Game from "#models/game";
import { listClaimedProgressionLevels } from "#services/progression/list_claimed_progression_levels";
import { touchPresence } from "#services/presence/presence";
import { canClaimDailyPack } from "#services/rewards/claim_daily_pack";
import { findQueueItemByUserId } from "#services/sockets/matchmaking";
import { randomUUID } from "node:crypto";
import type { HttpContext } from "@adonisjs/core/http";

// biome-ignore lint/suspicious/noConfusingVoidType:
export const me = async ({ auth, response }: HttpContext) => {
    const user = auth.user;

    if (!user) return response.unauthorized({ error: "Vous n'êtes pas connecté" });

    const currentGame = await Game.query()
        .where((q) => q.where("playerOneId", user.id).orWhere("playerTwoId", user.id))
        .andWhere("isFinished", false)
        .first();

    user.socketToken = randomUUID();

    await user.save();
    await touchPresence(user.id);

    const queueItem = findQueueItemByUserId(user.id);

    return {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        socketToken: user.socketToken,
        currentGameId: currentGame?.id ?? null,
        matchmakingSearchSessionId: queueItem?.searchSessionId ?? null,
        elo: user.elo,
        wins: user.wins,
        losses: user.losses,
        onboardingCompletedAt: user.onboardingCompletedAt?.toISO() ?? null,
        goldCoins: user.goldCoins,
        canClaimDailyPack: canClaimDailyPack(user),
        progression: getProgressionFromTotalXp(user.xp),
        claimedProgressionLevels: await listClaimedProgressionLevels(user.id),
    };
};
