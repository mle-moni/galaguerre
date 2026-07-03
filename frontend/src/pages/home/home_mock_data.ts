export interface HomeQuest {
    id: string;
    title: string;
    progress: number;
    total: number;
    rewardAmount: number;
    rewardType: "gold" | "crystal";
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
    pseudo: string;
    status: "online" | "in_game";
    avatarUrl: string;
}

export interface HomeEvent {
    id: string;
    title: string;
    shortDescription: string;
    longDescription: string;
    /** Relative path (/home/...) or absolute URL */
    imageUrl: string;
    daysFromNow: number;
}

export interface UpcomingHomeEvent {
    event: HomeEvent;
    date: Date;
}

export const HOME_MOCK_PROFILE = {
    title: "Arcaniste",
    level: 42,
    xp: 650,
    xpMax: 1000,
} as const;

export const HOME_MOCK_DAILY_QUESTS: HomeQuest[] = [
    { id: "q1", title: "Jouer 3 parties", progress: 2, total: 3, rewardAmount: 100, rewardType: "gold" },
    { id: "q2", title: "Gagner 1 partie classée", progress: 0, total: 1, rewardAmount: 50, rewardType: "crystal" },
    { id: "q3", title: "Ouvrir 1 pack", progress: 1, total: 1, rewardAmount: 75, rewardType: "gold" },
];

export const HOME_MOCK_QUEST_RESET = "12 h 45 min";

export const HOME_MOCK_SEASON = {
    name: "Saison des Éclats Célestes",
    timeRemaining: "24 j 12 h",
} as const;

export const HOME_MOCK_EVENTS: HomeEvent[] = [
    {
        id: "e1",
        title: "Festival des Lumières",
        shortDescription: "Gagnez des récompenses exclusives pendant le week-end.",
        longDescription:
            "Le Festival des Lumières revient pour trois jours de défis spéciaux. Complétez des quêtes quotidiennes, accumulez des points de lumière et débloquez des cosmétiques rares pour votre héros.",
        imageUrl: "/home/event-banner.webp",
        daysFromNow: 0,
    },
    {
        id: "e2",
        title: "Tournoi des Arcanes",
        shortDescription: "Affrontez les meilleurs joueurs en format élimination directe.",
        longDescription:
            "Inscrivez-vous au Tournoi des Arcanes : 32 participants, format simple élimination, récompenses en cristaux pour le top 8. Les inscriptions ferment 24 h avant le début.",
        imageUrl: "/home/news-2.webp",
        daysFromNow: 2,
    },
    {
        id: "e3",
        title: "Chasse aux Reliques",
        shortDescription: "Collectionnez des fragments de reliques dans vos parties.",
        longDescription:
            "Pendant une semaine, chaque victoire en partie classée vous rapporte des fragments de relique. Échangez-les contre des packs premium ou des cartes légendaires dans la boutique événementielle.",
        imageUrl: "https://picsum.photos/seed/galaguerre-event/640/360",
        daysFromNow: 10,
    },
    {
        id: "e4",
        title: "Nuit des Champions",
        shortDescription: "Soirée spéciale avec multiplicateur d'XP doublé.",
        longDescription:
            "La Nuit des Champions est l'occasion idéale de monter en niveau : XP doublé sur toutes les parties, défis bonus et tirage au sort d'un passe de saison offert parmi les participants.",
        imageUrl: "/home/news-3.webp",
        daysFromNow: 25,
    },
    {
        id: "e5",
        title: "Événement passé (hors fenêtre)",
        shortDescription: "Ne doit pas apparaître dans le carrousel.",
        longDescription: "Événement de test hors fenêtre temporelle.",
        imageUrl: "/home/event-banner.webp",
        daysFromNow: 45,
    },
];

const UPCOMING_EVENT_WINDOW_DAYS = 30;

const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const addDays = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

export const getUpcomingHomeEvents = (
    events: HomeEvent[],
    now: Date = new Date(),
): UpcomingHomeEvent[] => {
    const today = startOfDay(now);

    return events
        .filter((event) => event.daysFromNow >= 0 && event.daysFromNow <= UPCOMING_EVENT_WINDOW_DAYS)
        .map((event) => ({
            event,
            date: addDays(today, event.daysFromNow),
        }))
        .sort((a, b) => a.event.daysFromNow - b.event.daysFromNow);
};

export const formatHomeEventDate = (date: Date) =>
    date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

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

export const HOME_MOCK_FRIEND_AVATARS = [
    "/home/avatar-placeholder.webp",
] as const;

export const HOME_ASSETS = {
    heroBg: "/home/hero-bg.webp",
    iconGold: "/home/icon-gold.webp",
    iconCrystal: "/home/icon-crystal.webp",
    avatarPlaceholder: "/home/avatar-placeholder.webp",
    seasonPassChar: "/home/season-pass-char.webp",
} as const;
