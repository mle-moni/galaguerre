import type { GalaguerreCardType } from "../app/galaguerre/galaguerre.types.js";

export interface PlayerCard {
    uuid: string;
    cardId: number;
    type: GalaguerreCardType;
    label: string;
    imageUrl: string;
    cost: number;
}

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
    minionId: number;
    health: number;
    attack: number;
}

export interface BoardState {
    minions: MinionState[];
}

export interface GamePlayer {
    userId: number;
    deck: PlayerCard[];
    hand: PlayerCard[];
    board: BoardState;
    weaponState: WeaponState | null;
    health: number;
    mana: number;
}

export interface GameData {
    currentRound: number;
    playerOne: GamePlayer;
    playerTwo: GamePlayer;
    gameRounds: GameRound[];
}
