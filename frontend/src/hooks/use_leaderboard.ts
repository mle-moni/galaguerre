import { useApiQuery } from "~/hooks/use_api_query";
import { publicClient } from "~/services/client";

export const LEADERBOARD_QUERY_KEY = ["leaderboard"] as const;
export const AI_SPEEDRUN_LEADERBOARD_QUERY_KEY = ["leaderboard", "ai-speedrun"] as const;

export const useLeaderboardQuery = () => {
    return useApiQuery({
        queryKey: LEADERBOARD_QUERY_KEY,
        queryFn: async () => {
            return publicClient.api.leaderboard.index({});
        },
    });
};

export const useAiSpeedrunLeaderboardQuery = (enabled = true) => {
    return useApiQuery({
        queryKey: AI_SPEEDRUN_LEADERBOARD_QUERY_KEY,
        queryFn: async () => {
            return publicClient.api.leaderboard.aiSpeedrun({});
        },
        enabled,
    });
};
