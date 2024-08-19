export interface PlayerCardBase {
    uuid: string;
    cardId: number;
    label: string;
    imageUrl: string;
    cost: number;
}
export type PlayerCard = PlayerCardBase & PlayerCardType;

export type PlayerCardType =
    | {
          type: "MINION";
          health: number;
          attack: number;
      }
    | {
          type: "SPELL";
          // TODO
      }
    | {
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
    minionId: number;
    health: number;
    attack: number;
    placedAtRound: number;
}

export type MinionSpotId = "SPOT_1" | "SPOT_2" | "SPOT_3" | "SPOT_4" | "SPOT_5";

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
