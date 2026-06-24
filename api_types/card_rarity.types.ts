export type CardRarity = "COMMON" | "LEGENDARY";

export const CARD_RARITY_LABELS: Record<CardRarity, string> = {
    COMMON: "Commune",
    LEGENDARY: "Légendaire",
};

export const LEGENDARY_CARD_TOOLTIP =
    "Carte rare aux effets puissants. Un deck ne peut contenir qu'un seul exemplaire de chaque carte légendaire.";

export const COLLECTION_MAX_COPIES_BY_RARITY = {
    COMMON: 2,
    LEGENDARY: 1,
} as const;

export const PACK_DRAW_WEIGHT_BY_RARITY = {
    COMMON: 3,
    LEGENDARY: 1,
} as const;

export const getMaxCopiesForRarity = (rarity: CardRarity): number =>
    COLLECTION_MAX_COPIES_BY_RARITY[rarity];
