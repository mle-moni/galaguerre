export const CARD_TAGS = [
    "DEVELOPPEUR",
    "PM",
    "SALES",
    "DESIGNER",
    "PARISIEN",
    "NANTAIS",
    "LYONNAIS",
    "PETS",
    "SUPPORT",
] as const;

export type CardTag = (typeof CARD_TAGS)[number];

export const isCardTagImageSymbol = (symbol: string): boolean => symbol.startsWith("/");

export const formatTagChip = (tag: CardTag): string => {
    const meta = CARD_TAG_LABELS[tag];
    if (isCardTagImageSymbol(meta.symbol)) {
        return meta.label;
    }
    return `${meta.label} ${meta.symbol}`;
};

export const CARD_TAG_LABELS: Record<
    CardTag,
    { label: string; symbol: string; backgroundColor: string }
> = {
    DEVELOPPEUR: { label: "Développeur", symbol: "💻", backgroundColor: "#1e3a5f" },
    PM: { label: "PM", symbol: "📊", backgroundColor: "#1e3a5f" },
    SALES: { label: "Sales", symbol: "💰", backgroundColor: "#1e3a5f" },
    DESIGNER: { label: "Designer", symbol: "🎨", backgroundColor: "#1e3a5f" },
    PARISIEN: { label: "Parisien", symbol: "/game/parisien.webp", backgroundColor: "#ffffff" },
    NANTAIS: { label: "Nantais", symbol: "/game/nantais.webp", backgroundColor: "#ffffff" },
    LYONNAIS: { label: "Lyonnais", symbol: "/game/lyonnais.webp", backgroundColor: "#1e3a5f" },
    PETS: { label: "Pets", symbol: "🐾", backgroundColor: "#1e3a5f" },
    SUPPORT: { label: "Équipe support", symbol: "❤️‍🩹", backgroundColor: "#1e3a5f" },
};
