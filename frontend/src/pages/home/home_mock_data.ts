export interface HomeQuest {
    id: string;
    title: string;
    progress: number;
    total: number;
    rewardAmount: number;
    rewardType: "story_points" | "pack";
}

export interface HomeNewsItem {
    id: string;
    title: string;
    excerpt: string;
    timeAgo: string;
    imageUrl: string;
}

export interface HomeSeasonPassReward {
    level: number;
    claimed: boolean;
    current: boolean;
}

export interface HomeInvitation {
    id: string;
    fromPseudo: string;
    mode: string;
}

export interface HomeOnlineFriend {
    userId: number;
    pseudo: string | null;
    status: "online" | "in_game";
}

export const HOME_MOCK_PROFILE = {
    title: "Arcaniste",
    level: 42,
    xp: 650,
    xpMax: 1000,
} as const;

export const HOME_MOCK_DAILY_QUESTS: HomeQuest[] = [
    {
        id: "q1",
        title: "Jouer 3 parties",
        progress: 2,
        total: 3,
        rewardAmount: 50,
        rewardType: "story_points",
    },
    {
        id: "q2",
        title: "Gagner 1 partie classée",
        progress: 0,
        total: 1,
        rewardAmount: 1,
        rewardType: "pack",
    },
    {
        id: "q3",
        title: "Ouvrir 1 paquet",
        progress: 1,
        total: 1,
        rewardAmount: 25,
        rewardType: "story_points",
    },
];

export const HOME_MOCK_QUEST_RESET = "12 h 45 min";

export const HOME_MOCK_SEASON = {
    name: "Saison des Éclats Célestes",
    timeRemaining: "24 j 12 h",
} as const;

export const HOME_MOCK_NEWS: HomeNewsItem[] = [
    {
        id: "n1",
        title: "Mise à jour 1.4",
        excerpt: "Nouvelles cartes et équilibrage des héros.",
        timeAgo: "2 j.",
        imageUrl: "/home/news-1.webp",
    },
    {
        id: "n2",
        title: "Tournoi du week-end",
        excerpt: "Inscrivez-vous pour gagner des récompenses exclusives.",
        timeAgo: "5 j.",
        imageUrl: "/home/news-2.webp",
    },
    {
        id: "n3",
        title: "Nouveau passe de saison",
        excerpt: "Débloquez des récompenses légendaires.",
        timeAgo: "1 sem.",
        imageUrl: "/home/news-3.webp",
    },
];

export const HOME_MOCK_SEASON_PASS_REWARDS: HomeSeasonPassReward[] = [
    { level: 39, claimed: true, current: false },
    { level: 40, claimed: true, current: false },
    { level: 41, claimed: true, current: false },
    { level: 42, claimed: false, current: true },
    { level: 43, claimed: false, current: false },
    { level: 44, claimed: false, current: false },
];

export const HOME_MOCK_INVITATIONS: HomeInvitation[] = [
    { id: "i1", fromPseudo: "Zerath", mode: "Partie classée" },
    { id: "i2", fromPseudo: "Morgane", mode: "Partie rapide" },
];

export const HOME_ASSETS = {
    heroBg: "/home/hero-bg.webp",
    iconGold: "/home/icon-gold.webp",
    iconCrystal: "/home/icon-crystal.webp",
    seasonPassChar: "/home/season-pass-char.webp",
} as const;
