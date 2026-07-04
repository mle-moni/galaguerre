import type { ApiDailyQuestsResponse } from "#api_types/daily_quests.types";
import { getSecondsUntilParisMidnight } from "#services/daily_quests/daily_quest_titles";
import { getOrGenerateDailyQuests } from "#services/daily_quests/get_or_generate_daily_quests";
import { serializeDailyQuest } from "#services/daily_quests/serialize_daily_quest";

export const listDailyQuests = async (userId: number): Promise<ApiDailyQuestsResponse> => {
    const quests = await getOrGenerateDailyQuests(userId);

    return {
        quests: quests.map(serializeDailyQuest),
        resetInSeconds: getSecondsUntilParisMidnight(),
    };
};
