export type ComparisonOperator = "<" | ">" | "=";

export interface ComparisonSnapshot {
    costComparison: ComparisonOperator | null;
    cost: number | null;
    attackComparison: ComparisonOperator | null;
    attack: number | null;
    healthComparison: ComparisonOperator | null;
    health: number | null;
}

export interface PlayerCardBase {
    uuid: string;
    cardId: number;
    label: string;
    imageUrl: string;
    cost: number;
    tagIds: number[];
}
export type PlayerCard = MinionCard | SpellCard | WeaponCard;

export interface TargetSnapshot {
    type: "HERO" | "MINION" | "ALL";
    targetTeam: "PLAYER" | "OPPONENT";
    comparison: ComparisonSnapshot | null;
    tagId: number | null;
}

export interface ActionTarget {
    spotId: MinionSpotId | null;
    owner: SpotOwner;
}

export interface CardActionSnapshot {
    type: "DAMAGE" | "HEAL" | "DRAW" | "ENEMY_DRAW" | "BOOST" | "MINION_POWERS";
    isTargeted: boolean;
    damage: number | null;
    heal: number | null;
    drawCount: number | null;
    enemyDrawCount: number | null;
    target: TargetSnapshot | null;
}

export type MinionCard = PlayerCardBase & {
    type: "MINION";
    health: number;
    attack: number;
    hasTaunt: boolean;
    hasCharge: boolean;
    hasWindfury: boolean;
    isPoisonous: boolean;
    effects: string[];
    description: string;
    battlecryActions: CardActionSnapshot[];
};

export type SpellCard = PlayerCardBase & {
    type: "SPELL";
    // TODO
};

export type WeaponCard = PlayerCardBase & {
    type: "WEAPON";
    // TODO
};

export interface GameAction {
    uuid: string;
    cardId: number;
    playedForCost: number;
}

export interface GameRound {
    roundNumber: number;
    playerOneActions: GameAction[];
    playerTwoActions: GameAction[];
}

export interface WeaponState {
    uuid: string;
    weaponId: number;
    durability: number;
    damage: number;
}

export interface MinionState {
    uuid: string;
    health: number;
    attack: number;
    placedAtRound: number;
    lastActionAtRound: number;
    attacksThisRound: number;
    originalCard: PlayerCard;
}

export interface MinionPosition {
    position: BoardTargetPosition;
    minion: MinionState;
}

export interface BoardTargetPosition {
    spotId: MinionSpotId;
    owner: SpotOwner;
}

export const SPOT_OWNERS = ["PLAYER", "OPPONENT"] as const;

export type SpotOwner = (typeof SPOT_OWNERS)[number];

export const MINION_SPOT_IDS = ["SPOT_1", "SPOT_2", "SPOT_3", "SPOT_4", "SPOT_5"] as const;

export type MinionSpotId = (typeof MINION_SPOT_IDS)[number];

export type BoardState = {
    [K in MinionSpotId]: MinionState | null;
};

export interface GamePlayer {
    userId: number;
    pseudo: string;
    deckCards: PlayerCard[];
    hand: PlayerCard[];
    board: BoardState;
    weaponState: WeaponState | null;
    health: number;
    mana: number;
    maxFatigueDamageTaken: number;
}

export interface GameData {
    state: "INIT" | "PLAYER_ONE_TURN" | "PLAYER_TWO_TURN" | "FINISHED";
    currentRound: number;
    playerOne: GamePlayer;
    playerTwo: GamePlayer;
    gameRounds: GameRound[];
}

export interface ApiGame {
    id: number;
    playerOneId: number;
    playerTwoId: number;
    data: GameData;
    isFinished: boolean;
    createdAt: string;
    updatedAt: string;
}

export const PLAYER_NUMBERS = ["PLAYER_ONE", "PLAYER_TWO"] as const;

export type PlayerNumber = (typeof PLAYER_NUMBERS)[number];
