export const DEFAULT_HERO_HEALTH = 30;

export type ComparisonOperator = "<" | ">" | "=";

export interface ComparisonSnapshot {
    costComparison: ComparisonOperator | null;
    cost: number | null;
    attackComparison: ComparisonOperator | null;
    attack: number | null;
    healthComparison: ComparisonOperator | null;
    health: number | null;
}

export interface ComparableStats {
    cost: number;
    attack: number;
    health: number;
}

export interface CardTagSnapshot {
    label: string;
    symbol: string;
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
    targetTeam: "PLAYER" | "OPPONENT" | "ALL";
    comparison: ComparisonSnapshot | null;
    tagId: number | null;
    tag: CardTagSnapshot | null;
    excludeSelf: boolean;
    maxTargets: number | null;
    targetSelectionMode: "RANDOM" | null;
}

export interface CardFilterSnapshot {
    type: "MINION" | "SPELL" | "WEAPON";
    comparison: ComparisonSnapshot | null;
    tagIds: number[];
    tags: CardTagSnapshot[];
}

export interface ActionTarget {
    spotId: MinionSpotId | null;
    owner: SpotOwner;
}

export interface BoostMinionPowerSnapshot {
    hasTaunt: boolean;
    hasCharge: boolean;
    hasWindfury: boolean;
    isPoisonous: boolean;
}

export interface BoostSnapshot {
    attack: number | null;
    health: number | null;
    spellPower: number | null;
    minionPower: BoostMinionPowerSnapshot | null;
}

export interface CardActionSnapshot {
    type: "DAMAGE" | "HEAL" | "DRAW" | "ENEMY_DRAW" | "BOOST";
    isTargeted: boolean;
    damage: number | null;
    heal: number | null;
    drawCount: number | null;
    enemyDrawCount: number | null;
    drawCardFilter: CardFilterSnapshot | null;
    enemyDrawCardFilter: CardFilterSnapshot | null;
    boost: BoostSnapshot | null;
    target: TargetSnapshot | null;
}

export type PassiveTriggersOn = "TURN_END" | "TURN_BEGIN" | "DRAW" | "HEAL";

export interface PassiveBoostSnapshot {
    boost: BoostSnapshot;
    target: TargetSnapshot | null;
}

export interface PassiveSnapshot {
    type: "ACTION" | "BOOST";
    triggersOn: PassiveTriggersOn | null;
    action: CardActionSnapshot | null;
    passiveBoost: PassiveBoostSnapshot | null;
}

export interface AuraAppliedTarget {
    owner: SpotOwner;
    spotId: MinionSpotId;
    minionUuid: string;
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
    tags: CardTagSnapshot[];
    description: string;
    battlecryActions: CardActionSnapshot[];
    deathrattleActions: CardActionSnapshot[];
    passives: PassiveSnapshot[];
};

export type SpellCard = PlayerCardBase & {
    type: "SPELL";
    description: string;
    action: CardActionSnapshot;
};

export type WeaponCard = PlayerCardBase & {
    type: "WEAPON";
    damage: number;
    durability: number;
    description: string;
    deathrattleActions: CardActionSnapshot[];
};

export type GameLogEntryType =
    | "PLAY_CARD"
    | "PASS_TURN"
    | "FATIGUE_DAMAGE"
    | "DRAW"
    | "ATTACK"
    | "BATTLECRY"
    | "DEATHRATTLE"
    | "MINION_DEATH"
    | "WEAPON_BREAK";

export interface GameLogAttackTarget {
    type: "MINION" | "HERO";
    card?: PlayerCard;
    playerId?: number;
}

export interface GameLogEntry {
    id: string;
    roundNumber: number;
    playerId: number;
    type: GameLogEntryType;
    card?: PlayerCard;
    fatigueDamage?: number;
    attackerCard?: PlayerCard;
    attackTarget?: GameLogAttackTarget;
}

export interface WeaponState {
    uuid: string;
    weaponId: number;
    damage: number;
    durability: number;
    originalCard: WeaponCard;
}

export interface MinionKeywordFlags {
    hasTaunt: boolean;
    hasCharge: boolean;
    hasWindfury: boolean;
    isPoisonous: boolean;
}

export interface MinionState {
    uuid: string;
    health: number;
    attack: number;
    maxHealth: number;
    placedAtRound: number;
    lastActionAtRound: number;
    attacksThisRound: number;
    originalCard: PlayerCard;
    initialKeywords?: MinionKeywordFlags;
    permanentKeywords?: MinionKeywordFlags;
    auraAppliedTo?: AuraAppliedTarget[];
    auraHeroSpellPowerAppliedTo?: "PLAYER" | "OPPONENT" | "ALL" | null;
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

export interface GamePlayerStats {
    manaSpent: number;
    minionsPlayed: number;
    spellsCast: number;
    weaponsPlayed: number;
    damageDealt: number;
    healingDone: number;
    cardsDrawn: number;
    heroAttacks: number;
}

export const DEFAULT_PLAYER_STATS: GamePlayerStats = {
    manaSpent: 0,
    minionsPlayed: 0,
    spellsCast: 0,
    weaponsPlayed: 0,
    damageDealt: 0,
    healingDone: 0,
    cardsDrawn: 0,
    heroAttacks: 0,
};

export interface GamePlayer {
    userId: number;
    pseudo: string;
    deckCards: PlayerCard[];
    hand: PlayerCard[];
    board: BoardState;
    weaponState: WeaponState | null;
    heroAttacksThisRound: number;
    heroLastAttackAtRound: number;
    health: number;
    spellPower: number;
    mana: number;
    maxFatigueDamageTaken: number;
    stats: GamePlayerStats;
}

export interface GameRatingPlayerResult {
    eloBefore: number;
    eloAfter: number;
    delta: number;
}

export interface GameRatingResult {
    playerOne: GameRatingPlayerResult;
    playerTwo: GameRatingPlayerResult;
}

export interface GameData {
    state: "INIT" | "PLAYER_ONE_TURN" | "PLAYER_TWO_TURN" | "FINISHED";
    currentRound: number;
    playerOne: GamePlayer;
    playerTwo: GamePlayer;
    actionLog: GameLogEntry[];
    ratingResult?: GameRatingResult;
    isTraining?: boolean;
}

export interface ApiGame {
    id: number;
    playerOneId: number;
    playerTwoId: number | null;
    data: GameData;
    isFinished: boolean;
    createdAt: string;
    updatedAt: string;
}

export const PLAYER_NUMBERS = ["PLAYER_ONE", "PLAYER_TWO"] as const;

export type PlayerNumber = (typeof PLAYER_NUMBERS)[number];
