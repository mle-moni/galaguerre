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

export const PACK_LEGENDARY_DROP_CHANCE = 0.03;

export const getMaxCopiesForRarity = (rarity: CardRarity): number =>
    COLLECTION_MAX_COPIES_BY_RARITY[rarity];

const GOLD_COINS_PER_CARD_BUY_BY_RARITY = {
    COMMON: 50,
    LEGENDARY: 500,
} as const satisfies Record<CardRarity, number>;

const GOLD_COINS_PER_DUPLICATE_SELL_BY_RARITY = {
    COMMON: 25,
    LEGENDARY: 250,
} as const satisfies Record<CardRarity, number>;

export const getGoldCoinsPerCardBuy = (rarity: CardRarity): number =>
    GOLD_COINS_PER_CARD_BUY_BY_RARITY[rarity];

export const getGoldCoinsPerDuplicateSell = (rarity: CardRarity): number =>
    GOLD_COINS_PER_DUPLICATE_SELL_BY_RARITY[rarity];
