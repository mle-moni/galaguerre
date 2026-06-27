import type { CardRarity } from "./card_rarity.types.js";
import type {
    CardActionSnapshot,
    CardTag,
    MinionPowerSnapshot,
    PassiveSnapshot,
} from "./card.types.js";

export const DECK_MIN_CARDS = 30;
export const DECK_MAX_CARDS = 30;
export const DECK_MAX_COPIES_PER_CARD = 2;

export type DeckValidationErrorDetail = {
    cardId: number;
    cardLabel: string;
    actionIndex?: number;
    reason: string;
};

export interface ApiCardSet {
    id: number;
    name: string;
}

export interface ApiCatalogCardBase {
    id: number;
    label: string;
    imageUrl: string;
    cost: number;
    cardSetId: number;
    tags: CardTag[];
    rarity: CardRarity;
    description: string;
}

export type ApiCatalogMinionCard = ApiCatalogCardBase & {
    type: "MINION";
    health: number;
    attack: number;
    minionPowers: MinionPowerSnapshot | null;
    effects: string[];
    battlecryActions: CardActionSnapshot[];
    deathrattleActions: CardActionSnapshot[];
    passives: PassiveSnapshot[];
};

export type ApiCatalogSpellCard = ApiCatalogCardBase & {
    type: "SPELL";
    spellActions: CardActionSnapshot[];
    castsWhenDrawn: boolean;
};

export type ApiCatalogWeaponCard = ApiCatalogCardBase & {
    type: "WEAPON";
    damage: number;
    durability: number;
    deathrattleActions: CardActionSnapshot[];
};

export type ApiCatalogCard = ApiCatalogMinionCard | ApiCatalogSpellCard | ApiCatalogWeaponCard;

export interface ApiDeckCardEntry {
    cardId: number;
    count: number;
}

export interface ApiDeck {
    id: number;
    name: string;
    selected: boolean;
    cards: ApiDeckCardEntry[];
    cardCount: number;
    valid: boolean;
    compositionErrors: string[];
    cardValidationErrors: DeckValidationErrorDetail[];
}

export interface UpdateDeckPayload {
    name: string;
    cards: ApiDeckCardEntry[];
}
