import type { CardActionSnapshot, CardTagSnapshot, PassiveSnapshot } from "./game.types.js";

export type DeckValidationErrorDetail = {
    cardId: number;
    cardLabel: string;
    actionId?: number;
    actionInternalLabel?: string;
    reason: string;
};

export interface ApiCatalogCardBase {
    id: number;
    label: string;
    imageUrl: string;
    cost: number;
    tagIds: number[];
    description: string;
}

export type ApiCatalogMinionCard = ApiCatalogCardBase & {
    type: "MINION";
    health: number;
    attack: number;
    hasTaunt: boolean;
    hasCharge: boolean;
    hasWindfury: boolean;
    isPoisonous: boolean;
    effects: string[];
    tags: CardTagSnapshot[];
    battlecryActions: CardActionSnapshot[];
    deathrattleActions: CardActionSnapshot[];
    passives: PassiveSnapshot[];
};

export type ApiCatalogSpellCard = ApiCatalogCardBase & {
    type: "SPELL";
    action: CardActionSnapshot;
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
