export interface HomeSeasonPassReward {
    level: number;
    claimed: boolean;
    current: boolean;
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

export const HOME_MOCK_SEASON = {
    name: "Saison des Éclats Célestes",
    timeRemaining: "24 j 12 h",
} as const;

export const HOME_MOCK_SEASON_PASS_REWARDS: HomeSeasonPassReward[] = [
    { level: 39, claimed: true, current: false },
    { level: 40, claimed: true, current: false },
    { level: 41, claimed: true, current: false },
    { level: 42, claimed: false, current: true },
    { level: 43, claimed: false, current: false },
    { level: 44, claimed: false, current: false },
];

export const HOME_ASSETS = {
    heroBg: "/home/hero-bg.webp",
    iconGold: "/home/icon-gold.webp",
    iconCrystal: "/home/icon-crystal.webp",
    seasonPassChar: "/home/season-pass-char.webp",
} as const;
