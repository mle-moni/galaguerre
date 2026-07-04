import type { ApiDailyQuest } from "#api_types/daily_quests.types";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { useApiQuery } from "~/hooks/use_api_query";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { client } from "~/services/client";
import { PACKS_QUERY_KEY } from "./use_collection.js";
import { useUser } from "./use_user.js";

export const DAILY_QUESTS_QUERY_KEY = ["daily-quests"] as const;

export const useDailyQuestsQuery = () => {
    const user = useUser();

    return useApiQuery({
        queryKey: DAILY_QUESTS_QUERY_KEY,
        queryFn: async () => client.api.dailyQuests.index({}),
        enabled: !!user,
        refetchInterval: 60_000,
    });
};

export const useClaimDailyQuestMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        errorMessage: "Impossible de réclamer la récompense",
        mutationFn: async (questId: number) => {
            return client.api.dailyQuests.claim({
                params: { id: questId },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DAILY_QUESTS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
        },
    });
};

export const isQuestClaimable = (quest: ApiDailyQuest): boolean =>
    quest.completedAt !== null && quest.claimedAt === null;

export const isQuestClaimed = (quest: ApiDailyQuest): boolean => quest.claimedAt !== null;
