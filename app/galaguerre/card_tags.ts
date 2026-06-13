export const CARD_TAGS = [
    "DEVELOPPEUR",
    "PM",
    "SALES",
    "PARISIEN",
    "NANTAIS",
    "LYONNAIS",
    "PETS",
    "SUPPORT",
] as const;

export type CardTag = (typeof CARD_TAGS)[number];

export const CARD_TAG_LABELS: Record<CardTag, { label: string; symbol: string }> = {
    DEVELOPPEUR: { label: "Développeur", symbol: "💻" },
    PM: { label: "PM", symbol: "📊" },
    SALES: { label: "Sales", symbol: "💰" },
    PARISIEN: { label: "Parisien", symbol: "📍" },
    NANTAIS: { label: "Nantais", symbol: "📍" },
    LYONNAIS: { label: "Lyonnais", symbol: "📍" },
    PETS: { label: "Pets", symbol: "🐾" },
    SUPPORT: { label: "Équipe support", symbol: "❤️‍🩹" },
};
