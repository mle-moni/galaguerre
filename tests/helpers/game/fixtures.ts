import type {
    BoardState,
    GameData,
    GamePlayer,
    MinionCard,
    MinionSpotId,
    MinionState,
} from "#api_types/game.types";

export const MINION_IDS = {
    attacker: "minion-attacker",
    target: "minion-target",
    taunt: "minion-taunt",
} as const;

export const createEmptyBoard = (): BoardState => ({
    SPOT_1: null,
    SPOT_2: null,
    SPOT_3: null,
    SPOT_4: null,
    SPOT_5: null,
});

export const createMinionCard = (
    overrides: Partial<MinionCard> & { uuid?: string } = {},
): MinionCard => ({
    uuid: overrides.uuid ?? "card-default",
    cardId: 1,
    label: "Test Minion",
    imageUrl: "https://example.com/card.png",
    cost: 1,
    type: "MINION",
    attack: 1,
    health: 1,
    hasTaunt: false,
    hasCharge: false,
    hasWindfury: false,
    isPoisonous: false,
    effects: [],
    description: "",
    ...overrides,
});

export const createMinionState = (
    card: MinionCard,
    overrides: Partial<MinionState> = {},
): MinionState => ({
    uuid: card.uuid,
    health: card.health,
    attack: card.attack,
    placedAtRound: 0,
    lastActionAtRound: 0,
    attacksThisRound: 0,
    originalCard: { ...card },
    ...overrides,
});

export const createGamePlayer = (
    userId: number,
    overrides: Partial<GamePlayer> = {},
): GamePlayer => ({
    userId,
    pseudo: `player-${userId}`,
    deckCards: [],
    hand: [],
    board: createEmptyBoard(),
    weaponState: null,
    health: 15,
    mana: 10,
    maxFatigueDamageTaken: 0,
    ...overrides,
});

export const createGameData = (
    overrides: Omit<Partial<GameData>, "playerOne" | "playerTwo"> & {
        playerOne?: Partial<GamePlayer>;
        playerTwo?: Partial<GamePlayer>;
    } = {},
): GameData => {
    const { playerOne: p1Overrides, playerTwo: p2Overrides, ...rest } = overrides;

    return {
        state: "PLAYER_ONE_TURN",
        currentRound: 1,
        gameRounds: [],
        playerOne: createGamePlayer(1, p1Overrides),
        playerTwo: createGamePlayer(2, p2Overrides),
        ...rest,
    };
};

export const placeMinion = (
    board: BoardState,
    spotId: MinionSpotId,
    minion: MinionState,
): BoardState => ({
    ...board,
    [spotId]: minion,
});
