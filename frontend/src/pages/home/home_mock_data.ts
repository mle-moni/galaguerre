export interface HomeOnlineFriend {
    userId: number;
    pseudo: string | null;
    avatarCardId: number;
    status: "online" | "in_game";
    currentGameId: number | null;
    level: number;
    levelTitle: string;
}

export const HOME_ASSETS = {
    heroBg: "/home/hero-bg.webp",
    iconGold: "/home/icon-gold.webp",
    iconCrystal: "/home/icon-crystal.webp",
} as const;
