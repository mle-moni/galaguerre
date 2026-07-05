import type {
    DailyQuestDifficulty,
    DailyQuestRewardType,
    DailyQuestType,
} from "#api_types/daily_quests.types";

export interface DailyQuestVariant {
    difficulty: DailyQuestDifficulty;
    target: number;
    rewardType: DailyQuestRewardType;
    rewardAmount: number;
}

export interface DailyQuestDefinition {
    type: DailyQuestType;
    variants: DailyQuestVariant[];
}

export const FIXED_WIN_GAME_QUEST: DailyQuestVariant = {
    difficulty: "easy",
    target: 1,
    rewardType: "pack",
    rewardAmount: 1,
};

const DIFFICULTY_WEIGHTS: Record<DailyQuestDifficulty, number> = {
    easy: 15,
    medium: 35,
    hard: 50,
};

export const pickQuestVariant = (
    variants: DailyQuestVariant[],
    random: () => number,
): DailyQuestVariant => {
    const totalWeight = variants.reduce(
        (sum, variant) => sum + DIFFICULTY_WEIGHTS[variant.difficulty],
        0,
    );
    let roll = random() * totalWeight;

    for (const variant of variants) {
        roll -= DIFFICULTY_WEIGHTS[variant.difficulty];
        if (roll <= 0) {
            return variant;
        }
    }

    return variants[variants.length - 1]!;
};

export const RANDOM_DAILY_QUEST_DEFINITIONS: DailyQuestDefinition[] = [
    {
        type: "OPEN_PACK",
        variants: [
            { difficulty: "easy", target: 1, rewardType: "story_points", rewardAmount: 50 },
            { difficulty: "medium", target: 2, rewardType: "story_points", rewardAmount: 75 },
            { difficulty: "hard", target: 3, rewardType: "pack", rewardAmount: 1 },
        ],
    },
    {
        type: "WIN_GAMES",
        variants: [
            { difficulty: "easy", target: 2, rewardType: "story_points", rewardAmount: 50 },
            { difficulty: "medium", target: 3, rewardType: "story_points", rewardAmount: 75 },
            { difficulty: "hard", target: 4, rewardType: "pack", rewardAmount: 1 },
        ],
    },
    {
        type: "WIN_WITH_CARD",
        variants: [
            { difficulty: "medium", target: 1, rewardType: "story_points", rewardAmount: 80 },
        ],
    },
    {
        type: "PLAY_MINIONS",
        variants: [
            { difficulty: "easy", target: 15, rewardType: "story_points", rewardAmount: 50 },
            { difficulty: "medium", target: 25, rewardType: "story_points", rewardAmount: 70 },
            { difficulty: "hard", target: 35, rewardType: "story_points", rewardAmount: 100 },
        ],
    },
    {
        type: "DEAL_DAMAGE",
        variants: [
            { difficulty: "easy", target: 60, rewardType: "story_points", rewardAmount: 50 },
            { difficulty: "medium", target: 100, rewardType: "story_points", rewardAmount: 70 },
            { difficulty: "hard", target: 150, rewardType: "story_points", rewardAmount: 100 },
        ],
    },
    {
        type: "DRAW_CARDS",
        variants: [
            { difficulty: "easy", target: 15, rewardType: "story_points", rewardAmount: 45 },
            { difficulty: "medium", target: 25, rewardType: "story_points", rewardAmount: 65 },
            { difficulty: "hard", target: 35, rewardType: "story_points", rewardAmount: 90 },
        ],
    },
    {
        type: "HEAL_HP",
        variants: [
            { difficulty: "easy", target: 15, rewardType: "story_points", rewardAmount: 50 },
            { difficulty: "medium", target: 25, rewardType: "story_points", rewardAmount: 75 },
            { difficulty: "hard", target: 40, rewardType: "story_points", rewardAmount: 100 },
        ],
    },
    {
        type: "CAST_SPELLS",
        variants: [
            { difficulty: "easy", target: 8, rewardType: "story_points", rewardAmount: 50 },
            { difficulty: "medium", target: 12, rewardType: "story_points", rewardAmount: 70 },
            { difficulty: "hard", target: 18, rewardType: "story_points", rewardAmount: 95 },
        ],
    },
    {
        type: "HERO_ATTACKS",
        variants: [
            { difficulty: "easy", target: 6, rewardType: "story_points", rewardAmount: 45 },
            { difficulty: "medium", target: 10, rewardType: "story_points", rewardAmount: 65 },
            { difficulty: "hard", target: 15, rewardType: "story_points", rewardAmount: 90 },
        ],
    },
    {
        type: "SPEND_MANA",
        variants: [
            { difficulty: "easy", target: 45, rewardType: "story_points", rewardAmount: 50 },
            { difficulty: "medium", target: 70, rewardType: "story_points", rewardAmount: 70 },
            { difficulty: "hard", target: 100, rewardType: "story_points", rewardAmount: 95 },
        ],
    },
];

export const getQuestDefinition = (type: DailyQuestType): DailyQuestDefinition | undefined =>
    RANDOM_DAILY_QUEST_DEFINITIONS.find((definition) => definition.type === type);
