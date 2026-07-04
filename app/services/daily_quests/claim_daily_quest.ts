import type { ApiClaimDailyQuestResponse } from "#api_types/daily_quests.types";
import User from "#models/user";
import UserDailyQuest from "#models/user_daily_quest";
import { serializeDailyQuest } from "#services/daily_quests/serialize_daily_quest";
import { grantCardPacksForUser } from "#services/collection/grant_card_packs_for_user";
import { getUnopenedPackCount } from "#services/collection/get_unopened_pack_count";
import { getParisCalendarDate } from "#services/rewards/get_paris_calendar_date";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";

export class DailyQuestNotFoundError extends Error {
    constructor() {
        super("Quête introuvable");
        this.name = "DailyQuestNotFoundError";
    }
}

export class DailyQuestNotCompletedError extends Error {
    constructor() {
        super("Quête non terminée");
        this.name = "DailyQuestNotCompletedError";
    }
}

export class DailyQuestAlreadyClaimedError extends Error {
    constructor() {
        super("Récompense déjà réclamée");
        this.name = "DailyQuestAlreadyClaimedError";
    }
}

export const claimDailyQuest = async (
    userId: number,
    questId: number,
): Promise<ApiClaimDailyQuestResponse> => {
    return db.transaction(async (trx) => {
        const quest = await UserDailyQuest.query({ client: trx })
            .where("id", questId)
            .where("userId", userId)
            .where("questDate", getParisCalendarDate())
            .forUpdate()
            .first();

        if (!quest) {
            throw new DailyQuestNotFoundError();
        }

        if (!quest.completedAt) {
            throw new DailyQuestNotCompletedError();
        }

        if (quest.claimedAt) {
            throw new DailyQuestAlreadyClaimedError();
        }

        const user = await User.query({ client: trx })
            .where("id", userId)
            .forUpdate()
            .firstOrFail();

        if (quest.rewardType === "story_points") {
            user.goldCoins += quest.rewardAmount;
        } else {
            await grantCardPacksForUser(user.id, quest.rewardAmount, trx);
        }

        quest.claimedAt = DateTime.now();
        quest.useTransaction(trx);
        await quest.save();

        user.useTransaction(trx);
        await user.save();

        return {
            quest: serializeDailyQuest(quest),
            goldCoins: user.goldCoins,
            unopenedCount: await getUnopenedPackCount(user.id, trx),
        };
    });
};
