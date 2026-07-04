import {
    type ApiClaimProgressionLevelResponse,
    getProgressionFromTotalXp,
    isProgressionLevelClaimable,
    MAX_LEVEL,
} from "#api_types/progression";
import User from "#models/user";
import UserClaimedProgressionLevel from "#models/user_claimed_progression_level";
import { grantCardPacksForUser } from "#services/collection/grant_card_packs_for_user";
import { getUnopenedPackCount } from "#services/collection/get_unopened_pack_count";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";

export class ProgressionLevelNotClaimableError extends Error {
    constructor() {
        super("Récompense de niveau non disponible");
        this.name = "ProgressionLevelNotClaimableError";
    }
}

export class ProgressionLevelAlreadyClaimedError extends Error {
    constructor() {
        super("Récompense déjà réclamée");
        this.name = "ProgressionLevelAlreadyClaimedError";
    }
}

export const claimProgressionLevel = async (
    userId: number,
    level: number,
): Promise<ApiClaimProgressionLevelResponse> => {
    if (!Number.isInteger(level) || level < 1 || level >= MAX_LEVEL) {
        throw new ProgressionLevelNotClaimableError();
    }

    return db.transaction(async (trx) => {
        const user = await User.query({ client: trx })
            .where("id", userId)
            .forUpdate()
            .firstOrFail();

        const currentLevel = getProgressionFromTotalXp(user.xp).level;

        if (!isProgressionLevelClaimable(level, currentLevel)) {
            throw new ProgressionLevelNotClaimableError();
        }

        const existingClaim = await UserClaimedProgressionLevel.query({ client: trx })
            .where("userId", userId)
            .where("level", level)
            .forUpdate()
            .first();

        if (existingClaim) {
            throw new ProgressionLevelAlreadyClaimedError();
        }

        await UserClaimedProgressionLevel.create(
            {
                userId,
                level,
                claimedAt: DateTime.now(),
            },
            { client: trx },
        );

        await grantCardPacksForUser(userId, 1, trx);

        return {
            level,
            unopenedCount: await getUnopenedPackCount(userId, trx),
        };
    });
};
