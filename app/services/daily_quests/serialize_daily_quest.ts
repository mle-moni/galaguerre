import type { ApiDailyQuest } from "#api_types/daily_quests.types";
import type UserDailyQuest from "#models/user_daily_quest";
import { getDailyQuestTitle } from "#services/daily_quests/daily_quest_titles";

export const serializeDailyQuest = (quest: UserDailyQuest): ApiDailyQuest => ({
    id: quest.id,
    title: getDailyQuestTitle(quest),
    progress: quest.progress,
    target: quest.targetValue,
    rewardType: quest.rewardType,
    rewardAmount: quest.rewardAmount,
    completedAt: quest.completedAt?.toISO() ?? null,
    claimedAt: quest.claimedAt?.toISO() ?? null,
});
