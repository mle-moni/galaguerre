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
}

export interface BoardState {
    minions: MinionState[];
}

export interface GamePlayer {
    userId: number;
    deckCards: PlayerCard[];
    hand: PlayerCard[];
    board: BoardState;
    weaponState: WeaponState | null;
    health: number;
    mana: number;
}

export interface GameData {
    state: "INIT" | "PLAYER_ONE_TURN" | "PLAYER_TWO_TURN" | "FINISHED";
    currentRound: number;
    playerOne: GamePlayer;
    playerTwo: GamePlayer;
    gameRounds: GameRound[];
}
