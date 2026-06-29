export type CardRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export const CARD_RARITY_LABELS: Record<CardRarity, string> = {
    COMMON: "Commune",
    RARE: "Rare",
    EPIC: "Épique",
    LEGENDARY: "Légendaire",
};

export const LEGENDARY_CARD_TOOLTIP =
    "Carte rare aux effets puissants. Un deck ne peut contenir qu'un seul exemplaire de chaque carte légendaire.";

export const COLLECTION_MAX_COPIES_BY_RARITY = {
    COMMON: 2,
    RARE: 2,
    EPIC: 2,
    LEGENDARY: 1,
} as const;

export const PACK_RARITY_DROP_CHANCES = [
    { rarity: "LEGENDARY", chance: 0.03 },
    { rarity: "EPIC", chance: 0.06 },
    { rarity: "RARE", chance: 0.09 },
    { rarity: "COMMON", chance: 0.82 },
] as const satisfies ReadonlyArray<{ rarity: CardRarity; chance: number }>;

export const PACK_RARITY_FALLBACK_ORDER: readonly CardRarity[] = [
    "LEGENDARY",
    "EPIC",
    "RARE",
    "COMMON",
];

const PACK_RARITY_ROLL_SCALE = 10_000;

export const rollPackRarity = (random: () => number): CardRarity => {
    const roll = random() / PACK_RARITY_ROLL_SCALE;
    let cumulative = 0;

    for (const entry of PACK_RARITY_DROP_CHANCES) {
        cumulative += entry.chance;
        if (roll < cumulative) {
            return entry.rarity;
        }
    }

    return "COMMON";
};

export const getMaxCopiesForRarity = (rarity: CardRarity): number =>
    COLLECTION_MAX_COPIES_BY_RARITY[rarity];

const GOLD_COINS_PER_CARD_BUY_BY_RARITY = {
    COMMON: 50,
    RARE: 175,
    EPIC: 250,
    LEGENDARY: 500,
} as const satisfies Record<CardRarity, number>;

const GOLD_COINS_PER_DUPLICATE_SELL_BY_RARITY = {
    COMMON: 25,
    RARE: 88,
    EPIC: 125,
    LEGENDARY: 250,
} as const satisfies Record<CardRarity, number>;

export const getGoldCoinsPerCardBuy = (rarity: CardRarity): number =>
    GOLD_COINS_PER_CARD_BUY_BY_RARITY[rarity];

export const getGoldCoinsPerDuplicateSell = (rarity: CardRarity): number =>
    GOLD_COINS_PER_DUPLICATE_SELL_BY_RARITY[rarity];
