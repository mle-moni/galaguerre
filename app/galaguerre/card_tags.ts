export const CARD_TAGS = [
    "BEAST",
    "MECH",
    "MURLOC",
    "PIRATE",
    "DEVELOPPEUR",
    "PM",
    "PARISIEN",
    "NANTAIS",
    "LYONNAIS",
    "PETS",
] as const;

export type CardTag = (typeof CARD_TAGS)[number];

export const CARD_TAG_LABELS: Record<CardTag, { label: string; symbol: string }> = {
    BEAST: { label: "Bête", symbol: "🦁" },
    MECH: { label: "Méca", symbol: "⚙️" },
    MURLOC: { label: "Murloc", symbol: "🐟" },
    PIRATE: { label: "Pirate", symbol: "🏴‍☠️" },
    DEVELOPPEUR: { label: "Développeur", symbol: "💻" },
    PM: { label: "PM", symbol: "📊" },
    PARISIEN: { label: "Parisien", symbol: "📍" },
    NANTAIS: { label: "Nantais", symbol: "📍" },
    LYONNAIS: { label: "Lyonnais", symbol: "📍" },
    PETS: { label: "Pets", symbol: "🐾" },
};
