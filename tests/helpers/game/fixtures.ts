import {
    DEFAULT_HERO_HEALTH,
    DEFAULT_PLAYER_STATS,
    type ActionTarget,
    type BoardState,
    type BoostSnapshot,
    type CardActionSnapshot,
    type CardFilterSnapshot,
    type ComparisonSnapshot,
    type GameData,
    type GamePlayer,
    type MinionCard,
    type MinionPowerSnapshot,
    type MinionState,
    type PassiveSnapshot,
    type PlayerCard,
    type ReconvertParametersSnapshot,
    type SpellCard,
    type SpotOwner,
    type TargetSnapshot,
    type WeaponCard,
    type WeaponState,
} from "#api_types/game.types";
import { getMinionPowerEffects, normalizeMinionPowers } from "#galaguerre/minion_card_metadata";

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

export const createEmptyBoard = (): BoardState => [];

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
    tag: null,
    excludeSelf: false,
    onlySelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    adjacency: null,
    ...overrides,
});

export const createMinionTargetSnapshot = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    overrides: Partial<TargetSnapshot> = {},
): TargetSnapshot => ({
    type: "MINION",
    targetTeam,
    comparison: null,
    tag: null,
    excludeSelf: false,
    onlySelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    adjacency: null,
    ...overrides,
});

export const createAllTargetSnapshot = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    overrides: Partial<TargetSnapshot> = {},
): TargetSnapshot => ({
    type: "ALL",
    targetTeam,
    comparison: null,
    tag: null,
    excludeSelf: false,
    onlySelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    adjacency: null,
    ...overrides,
});

export const createBoostSnapshot = (overrides: Partial<BoostSnapshot> = {}): BoostSnapshot => ({
    attack: null,
    health: null,
    spellPower: null,
    extraBattlecryTriggers: null,
    minionPowers: null,
    ...overrides,
});

export const createCardFilterSnapshot = (
    overrides: Partial<CardFilterSnapshot> = {},
): CardFilterSnapshot => ({
    type: "MINION",
    comparison: null,
    tags: [],
    labelTags: [],
    rarity: null,
    ...overrides,
});

export const createReconvertParametersSnapshot = (
    overrides: Partial<ReconvertParametersSnapshot> = {},
): ReconvertParametersSnapshot => ({
    type: "MINION",
    comparison: null,
    tags: [],
    labelTags: [],
    rarity: null,
    cardId: null,
    relativeToSource: false,
    ...overrides,
});

type CardActionSnapshotOverrides = {
    type?: CardActionSnapshot["type"];
    isTargeted?: boolean;
    damage?: number;
    heal?: number;
    drawCount?: number;
    enemyDrawCount?: number;
    drawCardFilter?: CardFilterSnapshot | null;
    drawCardFilterAlternatives?: CardFilterSnapshot[];
    discoverCardFilter?: CardFilterSnapshot | null;
    discoverCardFilterAlternatives?: CardFilterSnapshot[];
    optionCount?: number;
    enemyDrawCardFilter?: CardFilterSnapshot | null;
    boost?: BoostSnapshot;
    reconvertParameters?: ReconvertParametersSnapshot;
    summonParameters?: ReconvertParametersSnapshot;
    summonCount?: number;
    summonTargetTeam?: "PLAYER" | "OPPONENT";
    deckCardOperation?: "ADD" | "DELETE";
    deckPlacement?: "TOP" | "BOTTOM" | "RANDOM" | null;
    deckTargetTeam?: "PLAYER" | "OPPONENT" | "ALL";
    handTargetTeam?: "PLAYER" | "OPPONENT" | "ALL";
    generateCount?: number;
    generateCardFilter?: CardFilterSnapshot | null;
    generateCardFilterAlternatives?: CardFilterSnapshot[];
    targetTeam?: "PLAYER" | "OPPONENT" | "ALL";
    cardId?: number | null;
    copyCount?: number | null;
    subtype?: "TEMPORARY_CHANGE";
    amount?: number;
    amountScale?: { source: "OPPONENT_MINION_COUNT"; amountPer: number } | null;
    costReduction?: number;
    target?: TargetSnapshot | null;
    onTargetResult?: CardActionSnapshot["onTargetResult"];
    actionCondition?: CardActionSnapshot["actionCondition"];
};

export const createCardActionSnapshot = (
    overrides: CardActionSnapshotOverrides = {},
): CardActionSnapshot => {
    const type = overrides.type ?? "DAMAGE";
    const actionCondition = overrides.actionCondition ?? null;
    const onTargetResult = overrides.onTargetResult ?? null;

    switch (type) {
        case "HEAL":
            return {
                type: "HEAL",
                isTargeted: overrides.isTargeted ?? false,
                heal: overrides.heal ?? 1,
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
        case "DRAW":
            return {
                type: "DRAW",
                isTargeted: false,
                drawCount: overrides.drawCount ?? 1,
                drawCardFilter: overrides.drawCardFilter ?? null,
                drawCardFilterAlternatives: overrides.drawCardFilterAlternatives ?? [],
                actionCondition,
                onTargetResult,
            };
        case "DISCOVER":
            return {
                type: "DISCOVER",
                isTargeted: false,
                discoverCardFilter:
                    overrides.discoverCardFilter !== undefined
                        ? overrides.discoverCardFilter
                        : {
                              type: "MINION",
                              comparison: null,
                              tags: [],
                              labelTags: [],
                              rarity: null,
                          },
                discoverCardFilterAlternatives: overrides.discoverCardFilterAlternatives ?? [],
                optionCount: overrides.optionCount ?? 3,
                actionCondition,
                onTargetResult,
            };
        case "ENEMY_DRAW":
            return {
                type: "ENEMY_DRAW",
                isTargeted: false,
                enemyDrawCount: overrides.enemyDrawCount ?? 1,
                enemyDrawCardFilter: overrides.enemyDrawCardFilter ?? null,
                actionCondition,
                onTargetResult,
            };
        case "BOOST":
            return {
                type: "BOOST",
                isTargeted: overrides.isTargeted ?? false,
                boost: overrides.boost ?? {
                    attack: 1,
                    health: null,
                    spellPower: null,
                    extraBattlecryTriggers: null,
                    minionPowers: null,
                },
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
        case "SILENCE":
            return {
                type: "SILENCE",
                isTargeted: overrides.isTargeted ?? false,
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
        case "DESTROY":
            return {
                type: "DESTROY",
                isTargeted: overrides.isTargeted ?? false,
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
        case "BREAK_WEAPON":
            return {
                type: "BREAK_WEAPON",
                isTargeted: overrides.isTargeted ?? false,
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
        case "RECONVERSION":
            return {
                type: "RECONVERSION",
                isTargeted: overrides.isTargeted ?? false,
                reconvertParameters:
                    overrides.reconvertParameters ?? createReconvertParametersSnapshot(),
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
        case "MIND_CONTROL":
            return {
                type: "MIND_CONTROL",
                isTargeted: overrides.isTargeted ?? false,
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
        case "RETURN_TO_HAND":
            return {
                type: "RETURN_TO_HAND",
                isTargeted: overrides.isTargeted ?? true,
                target: overrides.target ?? null,
                costReduction: overrides.costReduction ?? 2,
                actionCondition,
                onTargetResult,
            };
        case "SUMMON":
            return {
                type: "SUMMON",
                isTargeted: false,
                summonParameters: overrides.summonParameters ?? createReconvertParametersSnapshot(),
                summonCount: overrides.summonCount ?? 1,
                summonTargetTeam: overrides.summonTargetTeam ?? "PLAYER",
                actionCondition,
                onTargetResult,
            };
        case "DECK_CARD":
            return {
                type: "DECK_CARD",
                isTargeted: overrides.isTargeted ?? false,
                target: overrides.target ?? null,
                deckCardOperation: overrides.deckCardOperation ?? "ADD",
                deckPlacement:
                    overrides.deckPlacement !== undefined
                        ? overrides.deckPlacement
                        : overrides.deckCardOperation === "DELETE" && overrides.copyCount === null
                          ? null
                          : "RANDOM",
                deckTargetTeam: overrides.deckTargetTeam ?? "PLAYER",
                cardId: overrides.cardId !== undefined ? overrides.cardId : 121,
                copyCount: overrides.copyCount !== undefined ? overrides.copyCount : 1,
                actionCondition,
                onTargetResult,
            };
        case "HAND_CARD":
            return {
                type: "HAND_CARD",
                isTargeted: false,
                handTargetTeam: overrides.handTargetTeam ?? "PLAYER",
                cardId: overrides.cardId ?? 121,
                copyCount: overrides.copyCount ?? 1,
                actionCondition,
                onTargetResult,
            };
        case "GENERATE_HAND":
            return {
                type: "GENERATE_HAND",
                isTargeted: false,
                generateCount: overrides.generateCount ?? 1,
                generateCardFilter: overrides.generateCardFilter ?? null,
                generateCardFilterAlternatives: overrides.generateCardFilterAlternatives ?? [],
                handTargetTeam: overrides.handTargetTeam ?? "PLAYER",
                actionCondition,
                onTargetResult,
            };
        case "MANA":
            return {
                type: "MANA",
                isTargeted: false,
                subtype: overrides.subtype ?? "TEMPORARY_CHANGE",
                amount: overrides.amount ?? 1,
                amountScale: overrides.amountScale ?? null,
                actionCondition,
                onTargetResult,
            };
        case "NEXT_SPELL_COST_REDUCTION":
            return {
                type: "NEXT_SPELL_COST_REDUCTION",
                isTargeted: false,
                amount: overrides.amount ?? 2,
                actionCondition,
                onTargetResult,
            };
        case "DEFEAT":
            return {
                type: "DEFEAT",
                isTargeted: false,
                targetTeam: overrides.targetTeam ?? "OPPONENT",
                actionCondition,
                onTargetResult,
            };
        case "DAMAGE":
        default:
            return {
                type: "DAMAGE",
                isTargeted: overrides.isTargeted ?? false,
                damage: overrides.damage ?? 1,
                target: overrides.target ?? null,
                actionCondition,
                onTargetResult,
            };
    }
};

export const createMinionCard = (
    overrides: Partial<MinionCard> & { uuid?: string } = {},
): MinionCard => {
    const cost = overrides.cost ?? 1;

    return {
        uuid: overrides.uuid ?? "card-default",
        cardId: 1,
        label: "Test Minion",
        imageUrl: "https://example.com/card.png",
        baseCost: overrides.baseCost ?? cost,
        cost,
        dynamicCost: overrides.dynamicCost ?? null,
        tags: [],
        labelTags: [],
        rarity: "COMMON",
        type: "MINION",
        attack: 1,
        health: 1,
        minionPowers: normalizeMinionPowers(null),
        effects: [],
        description: "",
        battlecryActions: [],
        comboActions: [],
        deathrattleActions: [],
        attackActions: [],
        passives: [],
        ...overrides,
    };
};

export const createMinionPowersSnapshot = (
    overrides: Partial<MinionPowerSnapshot> = {},
): MinionPowerSnapshot => normalizeMinionPowers(overrides);

export const createPassiveSnapshot = (
    overrides: Partial<PassiveSnapshot> = {},
): PassiveSnapshot => ({
    type: "ACTION",
    triggersOn: "TURN_END",
    action: null,
    passiveBoost: null,
    playCardFilter: null,
    summonFilter: null,
    triggerTargetFilter: null,
    ...overrides,
});

export const createMinionState = (
    card: MinionCard,
    overrides: Partial<MinionState> = {},
): MinionState => {
    const minionPowers = normalizeMinionPowers(card.minionPowers);

    return {
        uuid: card.uuid,
        health: card.health,
        attack: card.attack,
        maxHealth: card.health,
        placedAtRound: 0,
        lastActionAtRound: 0,
        attacksThisRound: 0,
        divineShieldConsumed: false,
        stealthConsumed: false,
        initialKeywords: {
            hasTaunt: minionPowers.hasTaunt,
            hasCharge: minionPowers.hasCharge,
            hasRush: minionPowers.hasRush,
            hasWindfury: minionPowers.hasWindfury,
            isPoisonous: minionPowers.isPoisonous,
            hasStealth: minionPowers.hasStealth,
            hasDivineShield: minionPowers.hasDivineShield,
        },
        permanentKeywords: {
            hasTaunt: false,
            hasCharge: false,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
        originalCard: {
            ...card,
            minionPowers,
            effects: getMinionPowerEffects(minionPowers),
        },
        isSilenced: false,
        ...overrides,
    };
};

export const createGamePlayer = (
    userId: number,
    overrides: Partial<GamePlayer> = {},
): GamePlayer => ({
    userId,
    pseudo: `player-${userId}`,
    avatarCardId: 148,
    deckCards: [],
    hand: [],
    board: createEmptyBoard(),
    weaponState: null,
    heroAttacksThisRound: 0,
    heroLastAttackAtRound: 0,
    health: DEFAULT_HERO_HEALTH,
    spellPower: 0,
    extraBattlecryTriggers: 0,
    cardsPlayedThisTurn: 0,
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
        actionLog: [],
        playerOne: createGamePlayer(1, p1Overrides),
        playerTwo: createGamePlayer(2, p2Overrides),
        ...rest,
    };
};

export const placeMinion = (
    board: BoardState,
    boardIndex: number,
    minion: MinionState,
): BoardState => {
    const next = [...board];
    next.splice(boardIndex, 0, minion);
    return next;
};

export const actionTargetAtIndex = (
    board: BoardState,
    boardIndex: number,
    owner: SpotOwner,
): ActionTarget => ({
    owner,
    minionUuid: board[boardIndex]!.uuid,
});

export const createSpellCard = (
    overrides: Partial<SpellCard> & { uuid?: string } = {},
): SpellCard => {
    const defaultSpellActions = [
        createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
            target: createHeroTargetSnapshot("OPPONENT"),
        }),
    ];
    const { spellActions = defaultSpellActions, castsWhenDrawn = false, ...rest } = overrides;
    const cost = rest.cost ?? 2;

    return {
        uuid: rest.uuid ?? CARD_IDS.spell,
        cardId: 2,
        label: "Test Spell",
        imageUrl: "https://example.com/spell.png",
        baseCost: rest.baseCost ?? cost,
        cost,
        dynamicCost: rest.dynamicCost ?? null,
        tags: [],
        labelTags: [],
        rarity: "COMMON",
        type: "SPELL",
        description: "Effet : Inflige 3 dégâts au héros adverse.",
        spellActions,
        castsWhenDrawn,
        ...rest,
    };
};

export const createWeaponCard = (
    overrides: Partial<WeaponCard> & { uuid?: string } = {},
): WeaponCard => {
    const cost = overrides.cost ?? 3;

    return {
        uuid: overrides.uuid ?? CARD_IDS.weapon,
        cardId: 3,
        label: "Test Weapon",
        imageUrl: "https://example.com/weapon.png",
        baseCost: overrides.baseCost ?? cost,
        cost,
        dynamicCost: overrides.dynamicCost ?? null,
        tags: [],
        labelTags: [],
        rarity: "COMMON",
        type: "WEAPON",
        damage: 3,
        durability: 2,
        description: "Arme 3/2.",
        deathrattleActions: [],
        ...overrides,
    };
};

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
