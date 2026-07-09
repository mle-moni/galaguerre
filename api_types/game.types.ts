export const DEFAULT_HERO_HEALTH = 30;

export const COIN_CARD_ID = 1;

export type ComparisonOperator = "<" | ">" | "=";

export type { CardLabelTag, CardTag } from "./card.types.js";
export type {
    CardActionSnapshot,
    CardActionFieldsSnapshot,
    BoostSnapshot,
    MinionPowerSnapshot,
    CardFilterSnapshot,
    ReconvertParametersSnapshot,
    ComparisonSnapshot,
    OnTargetResultDefinition,
    PassiveSnapshot,
    PassiveBoostSnapshot,
    TargetSnapshot,
    DynamicCostSnapshot,
} from "./card.types.js";

import type {
    CardActionSnapshot,
    CardLabelTag,
    CardTag,
    DynamicCostSnapshot,
    MinionPowerSnapshot,
    PassiveSnapshot,
} from "./card.types.js";
import type { CardRarity } from "./card_rarity.types.js";
import type { GameXpResult } from "./progression.js";
import type { GameRewardResult } from "./rewards.types.js";

export interface ComparableStats {
    cost: number;
    attack: number;
    health: number;
}

export interface PlayerCardBase {
    uuid: string;
    cardId: number;
    label: string;
    imageUrl: string;
    baseCost: number;
    cost: number;
    handCostReduction?: number;
    dynamicCost: DynamicCostSnapshot | null;
    tags: CardTag[];
    labelTags: CardLabelTag[];
    rarity: CardRarity;
    generatedBy?: { cardId: number; label: string };
}
export type PlayerCard = MinionCard | SpellCard | WeaponCard;

export interface ActionTarget {
    minionUuid: string | null;
    owner: SpotOwner;
}

export type PassiveTriggersOn =
    | "TURN_END"
    | "TURN_BEGIN"
    | "DRAW"
    | "HEAL"
    | "DAMAGE"
    | "PLAY_CARD"
    | "SUMMON";

export interface AuraAppliedTarget {
    owner: SpotOwner;
    minionUuid: string;
}

export type MinionCard = PlayerCardBase & {
    type: "MINION";
    health: number;
    attack: number;
    minionPowers: MinionPowerSnapshot;
    effects: string[];
    description: string;
    battlecryActions: CardActionSnapshot[];
    deathrattleActions: CardActionSnapshot[];
    passives: PassiveSnapshot[];
};

export type SpellCard = PlayerCardBase & {
    type: "SPELL";
    description: string;
    spellActions: CardActionSnapshot[];
    castsWhenDrawn: boolean;
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
    | "CAST_WHEN_DRAWN"
    | "PASS_TURN"
    | "FATIGUE_DAMAGE"
    | "DRAW"
    | "OVERDRAW"
    | "ATTACK"
    | "BATTLECRY"
    | "DEATHRATTLE"
    | "MINION_DEATH"
    | "WEAPON_BREAK"
    | "ABANDON";

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

export interface MinionState {
    uuid: string;
    health: number;
    attack: number;
    maxHealth: number;
    placedAtRound: number;
    lastActionAtRound: number;
    attacksThisRound: number;
    originalCard: PlayerCard;
    initialKeywords?: MinionPowerSnapshot;
    permanentKeywords?: MinionPowerSnapshot;
    auraAppliedTo?: AuraAppliedTarget[];
    auraHeroSpellPowerAppliedTo?: "PLAYER" | "OPPONENT" | "ALL" | null;
    auraSelfScaledBoost?: { attack: number; health: number; spellPower: number } | null;
    isSilenced?: boolean;
    divineShieldConsumed?: boolean;
}

export interface MinionPosition {
    position: BoardTargetPosition;
    minion: MinionState;
}

export interface BoardTargetPosition {
    boardIndex: number;
    owner: SpotOwner;
}

export const SPOT_OWNERS = ["PLAYER", "OPPONENT"] as const;

export type SpotOwner = (typeof SPOT_OWNERS)[number];

export { MAX_BOARD_MINIONS, createEmptyBoard } from "./board.js";

export type BoardState = MinionState[];

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

export type { GameRewardPlayerResult, GameRewardResult } from "./rewards.types.js";
export type { GameXpPlayerResult, GameXpResult } from "./progression.js";

export interface GameMulliganState {
    playerOneDone: boolean;
    playerTwoDone: boolean;
}

export type DiscoverEffectKind = "BATTLECRY" | "SPELL" | "DEATHRATTLE" | "PASSIVE";

export interface DiscoverContinuation {
    remainingActions: CardActionSnapshot[];
    context: {
        effectKind: DiscoverEffectKind;
        selectedTarget?: ActionTarget;
        damageBonus: number;
        sourceMinionUuid?: string;
    };
}

export interface GamePendingDiscover {
    playerUserId: number;
    sourceCardId: number;
    sourceCardLabel: string;
    sourceCardUuid: string;
    options: PlayerCard[];
    continuation: DiscoverContinuation;
}

export interface GameData {
    state: "INIT" | "MULLIGAN" | "PLAYER_ONE_TURN" | "PLAYER_TWO_TURN" | "FINISHED";
    currentRound: number;
    playerOne: GamePlayer;
    playerTwo: GamePlayer;
    actionLog: GameLogEntry[];
    mulligan?: GameMulliganState;
    pendingDiscover?: GamePendingDiscover;
    turnEndsAt?: number;
    mulliganEndsAt?: number;
    ratingResult?: GameRatingResult;
    rewardResult?: GameRewardResult;
    xpResult?: GameXpResult;
    dailyQuestProgressApplied?: boolean;
    postGameProgressionApplied?: boolean;
    isTraining?: boolean;
    isOnboardingTutorial?: boolean;
}

export interface ApiGame {
    id: number;
    playerOneId: number | null;
    playerTwoId: number | null;
    data: GameData;
    isFinished: boolean;
    createdAt: string;
    updatedAt: string;
    endedAt: string | null;
}

export const PLAYER_NUMBERS = ["PLAYER_ONE", "PLAYER_TWO"] as const;

export type PlayerNumber = (typeof PLAYER_NUMBERS)[number];
