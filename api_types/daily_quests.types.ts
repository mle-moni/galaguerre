export const DAILY_QUEST_TYPES = [
    "WIN_GAME",
    "WIN_GAMES",
    "WIN_WITH_CARD",
    "OPEN_PACK",
    "PLAY_MINIONS",
    "DEAL_DAMAGE",
    "DRAW_CARDS",
    "HEAL_HP",
    "CAST_SPELLS",
    "HERO_ATTACKS",
    "SPEND_MANA",
] as const;

export type DailyQuestType = (typeof DAILY_QUEST_TYPES)[number];

export type DailyQuestRewardType = "story_points" | "pack";

export type DailyQuestDifficulty = "easy" | "medium" | "hard";

export interface DailyQuestParams {
    cardId?: number;
    cardName?: string;
}

export interface ApiDailyQuest {
    id: number;
    title: string;
    questType: DailyQuestType;
    params: DailyQuestParams | null;
    progress: number;
    target: number;
    rewardType: DailyQuestRewardType;
    rewardAmount: number;
    completedAt: string | null;
    claimedAt: string | null;
}

export interface ApiDailyQuestsResponse {
    quests: ApiDailyQuest[];
    resetInSeconds: number;
}

export interface ApiClaimDailyQuestResponse {
    quest: ApiDailyQuest;
    goldCoins: number;
    unopenedCount: number;
}
