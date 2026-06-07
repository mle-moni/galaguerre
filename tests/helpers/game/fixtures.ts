import {
    DEFAULT_HERO_HEALTH,
    DEFAULT_PLAYER_STATS,
    type BoardState,
    type BoostSnapshot,
    type CardActionSnapshot,
    type CardFilterSnapshot,
    type ComparisonSnapshot,
    type GameData,
    type GamePlayer,
    type MinionCard,
    type MinionSpotId,
    type MinionState,
    type PassiveSnapshot,
    type PlayerCard,
    type SpellCard,
    type TargetSnapshot,
    type WeaponCard,
    type WeaponState,
} from "#api_types/game.types";

export const MINION_IDS = {
    attacker: "minion-attacker",
    target: "minion-target",
    taunt: "minion-taunt",
} as const;

export const CARD_IDS = {
    handMinion: "card-hand-minion",
    spell: "card-spell",
    weapon: "card-weapon",
} as const;

export const createEmptyBoard = (): BoardState => ({
    SPOT_1: null,
    SPOT_2: null,
    SPOT_3: null,
    SPOT_4: null,
    SPOT_5: null,
});

export const createComparisonSnapshot = (
    overrides: Partial<ComparisonSnapshot> = {},
): ComparisonSnapshot => ({
    costComparison: null,
    cost: null,
    attackComparison: null,
    attack: null,
    healthComparison: null,
    health: null,
    ...overrides,
});

export const createHeroTargetSnapshot = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    overrides: Partial<TargetSnapshot> = {},
): TargetSnapshot => ({
    type: "HERO",
    targetTeam,
    comparison: null,
    tagId: null,
    tag: null,
    excludeSelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    ...overrides,
});

export const createMinionTargetSnapshot = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    overrides: Partial<TargetSnapshot> = {},
): TargetSnapshot => ({
    type: "MINION",
    targetTeam,
    comparison: null,
    tagId: null,
    tag: null,
    excludeSelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    ...overrides,
});

export const createAllTargetSnapshot = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    overrides: Partial<TargetSnapshot> = {},
): TargetSnapshot => ({
    type: "ALL",
    targetTeam,
    comparison: null,
    tagId: null,
    tag: null,
    excludeSelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    ...overrides,
});

export const createBoostSnapshot = (overrides: Partial<BoostSnapshot> = {}): BoostSnapshot => ({
    attack: null,
    health: null,
    spellPower: null,
    minionPower: null,
    ...overrides,
});

export const createCardFilterSnapshot = (
    overrides: Partial<CardFilterSnapshot> = {},
): CardFilterSnapshot => ({
    type: "MINION",
    comparison: null,
    tagIds: [],
    tags: [],
    ...overrides,
});

export const createCardActionSnapshot = (
    overrides: Partial<CardActionSnapshot> = {},
): CardActionSnapshot => ({
    type: "DAMAGE",
    isTargeted: false,
    damage: null,
    heal: null,
    drawCount: null,
    enemyDrawCount: null,
    drawCardFilter: null,
    enemyDrawCardFilter: null,
    boost: null,
    target: null,
    ...overrides,
});

export const createMinionCard = (
    overrides: Partial<MinionCard> & { uuid?: string } = {},
): MinionCard => ({
    uuid: overrides.uuid ?? "card-default",
    cardId: 1,
    label: "Test Minion",
    imageUrl: "https://example.com/card.png",
    cost: 1,
    tagIds: [],
    type: "MINION",
    attack: 1,
    health: 1,
    hasTaunt: false,
    hasCharge: false,
    hasWindfury: false,
    isPoisonous: false,
    effects: [],
    tags: [],
    description: "",
    battlecryActions: [],
    deathrattleActions: [],
    passives: [],
    ...overrides,
});

export const createPassiveSnapshot = (
    overrides: Partial<PassiveSnapshot> = {},
): PassiveSnapshot => ({
    type: "ACTION",
    triggersOn: "TURN_END",
    action: null,
    passiveBoost: null,
    ...overrides,
});

export const createMinionState = (
    card: MinionCard,
    overrides: Partial<MinionState> = {},
): MinionState => ({
    uuid: card.uuid,
    health: card.health,
    attack: card.attack,
    maxHealth: card.health,
    placedAtRound: 0,
    lastActionAtRound: 0,
    attacksThisRound: 0,
    initialKeywords: {
        hasTaunt: card.hasTaunt,
        hasCharge: card.hasCharge,
        hasWindfury: card.hasWindfury,
        isPoisonous: card.isPoisonous,
    },
    permanentKeywords: {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
    },
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
    heroAttacksThisRound: 0,
    heroLastAttackAtRound: 0,
    health: DEFAULT_HERO_HEALTH,
    spellPower: 0,
    mana: 10,
    maxFatigueDamageTaken: 0,
    stats: { ...DEFAULT_PLAYER_STATS },
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

export const createSpellCard = (
    overrides: Partial<SpellCard> & { uuid?: string } = {},
): SpellCard => {
    const action =
        overrides.action ??
        createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
            target: createHeroTargetSnapshot("OPPONENT"),
        });

    return {
        uuid: overrides.uuid ?? CARD_IDS.spell,
        cardId: 2,
        label: "Test Spell",
        imageUrl: "https://example.com/spell.png",
        cost: 2,
        tagIds: [],
        type: "SPELL",
        description: "Effet : Inflige 3 dégâts au héros adverse.",
        action,
        ...overrides,
    };
};

export const createWeaponCard = (
    overrides: Partial<WeaponCard> & { uuid?: string } = {},
): WeaponCard => ({
    uuid: overrides.uuid ?? CARD_IDS.weapon,
    cardId: 3,
    label: "Test Weapon",
    imageUrl: "https://example.com/weapon.png",
    cost: 3,
    tagIds: [],
    type: "WEAPON",
    damage: 3,
    durability: 2,
    description: "Arme 3/2.",
    deathrattleActions: [],
    ...overrides,
});

export const createWeaponState = (
    card: WeaponCard,
    overrides: Partial<WeaponState> = {},
): WeaponState => ({
    uuid: card.uuid,
    weaponId: card.cardId,
    damage: card.damage,
    durability: card.durability,
    originalCard: { ...card },
    ...overrides,
});

export const withHand = (hand: PlayerCard[]): Partial<GamePlayer> => ({ hand });
