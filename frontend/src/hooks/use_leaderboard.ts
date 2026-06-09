import type {
    ApiAiSpeedrunLeaderboardEntry,
    ApiLeaderboardEntry,
} from "#api_types/leaderboard.types";
import { useQuery } from "@tanstack/react-query";
import { publicAxios } from "~/services/axios";

export const LEADERBOARD_QUERY_KEY = ["leaderboard"] as const;
export const AI_SPEEDRUN_LEADERBOARD_QUERY_KEY = ["leaderboard", "ai-speedrun"] as const;

export const useLeaderboardQuery = () => {
    return useQuery({
        queryKey: LEADERBOARD_QUERY_KEY,
        queryFn: async () => {
            const response = await publicAxios.get<ApiLeaderboardEntry[]>("/api/leaderboard");
            return response.data;
        },
    });
};

export const useAiSpeedrunLeaderboardQuery = (enabled = true) => {
    return useQuery({
        queryKey: AI_SPEEDRUN_LEADERBOARD_QUERY_KEY,
        queryFn: async () => {
            const response = await publicAxios.get<ApiAiSpeedrunLeaderboardEntry[]>(
                "/api/leaderboard/ai-speedrun",
            );
            return response.data;
        },
        enabled,
    });
};
