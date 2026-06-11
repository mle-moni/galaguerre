import type { CardTag } from "#galaguerre/card_tags";
import type {
    CardActionDefinition,
    BoostDefinition,
    ComparisonDefinition,
    PassiveDefinition,
    TargetDefinition,
} from "#galaguerre/card_definition.validation";
import type {
    CardData,
    MinionCardData,
    SpellCardData,
    WeaponCardData,
} from "#galaguerre/card_definition.schema";
import {
    parseCardData,
    parseMinionData,
    parseSpellData,
    parseWeaponData,
} from "#galaguerre/card_definition.schema";
export type CardSeedEntry = {
    id: number;
    cardSetName: string;
    data: CardData;
};

type CardSeedBase = {
    label: string;
    cost: number;
    imageUrl: string;
    cardSetName: string;
};

type MinionSeedBase = CardSeedBase & {
    attack: number;
    health: number;
};

const nullComparison = (): ComparisonDefinition => ({
    costComparison: null,
    cost: null,
    attackComparison: null,
    attack: null,
    healthComparison: null,
    health: null,
});

const nullActionFields = () => ({
    drawCount: null,
    enemyDrawCount: null,
    drawCardFilter: null,
    enemyDrawCardFilter: null,
    damage: null,
    heal: null,
    boost: null,
    target: null,
});

export const defaultMinionData = (): MinionCardData => ({
    schemaVersion: 1,
    type: "MINION",
    tags: [],
    name: "Test Card",
    cost: 1,
    imageUrl: "https://example.com/card.png",
    attack: 1,
    health: 1,
    hasTaunt: false,
    hasCharge: false,
    hasWindfury: false,
    isPoisonous: false,
    battlecryActions: [],
    deathrattleActions: [],
    passives: [],
});

export const defaultSpellData = (): SpellCardData => ({
    schemaVersion: 1,
    type: "SPELL",
    tags: [],
    name: "Test Card",
    cost: 1,
    imageUrl: "https://example.com/card.png",
    action: damageAction(1, enemyHero()),
});

export const defaultWeaponData = (): WeaponCardData => ({
    schemaVersion: 1,
    type: "WEAPON",
    tags: [],
    name: "Test Card",
    cost: 1,
    imageUrl: "https://example.com/card.png",
    damage: 1,
    durability: 1,
    deathrattleActions: [],
});

export const comparison = (overrides: Partial<ComparisonDefinition>): ComparisonDefinition => ({
    ...nullComparison(),
    ...overrides,
});

export const attackGreaterThan = (attack: number): ComparisonDefinition =>
    comparison({ attackComparison: ">", attack });

export const healthLessThan = (health: number): ComparisonDefinition =>
    comparison({ healthComparison: "<", health });

export const costEquals = (cost: number): ComparisonDefinition =>
    comparison({ costComparison: "=", cost });

export const costLessThan = (cost: number): ComparisonDefinition =>
    comparison({ costComparison: "<", cost });

const baseTarget = (overrides: Partial<TargetDefinition>): TargetDefinition => ({
    type: "HERO",
    targetTeam: "OPPONENT",
    comparison: null,
    tag: null,
    excludeSelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    ...overrides,
});

export const enemyHero = (): TargetDefinition =>
    baseTarget({ type: "HERO", targetTeam: "OPPONENT" });

export const allyHero = (): TargetDefinition => baseTarget({ type: "HERO", targetTeam: "PLAYER" });

export const enemyMinions = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "OPPONENT" });

export const allyMinions = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER" });

export const allMinions = (): TargetDefinition => baseTarget({ type: "MINION", targetTeam: "ALL" });

export const allCharacters = (): TargetDefinition => baseTarget({ type: "ALL", targetTeam: "ALL" });

export const allEnemies = (): TargetDefinition =>
    baseTarget({ type: "ALL", targetTeam: "OPPONENT" });

export const otherAllyMinions = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER", excludeSelf: true });

export const otherAllyMinionsWithTag = (tag: CardTag): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER", tag, excludeSelf: true });

export const targetedEnemyHero = (): TargetDefinition =>
    baseTarget({ type: "HERO", targetTeam: "OPPONENT" });

export const targetedEnemyMinion = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "OPPONENT" });

export const targetedAllyMinion = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER" });

export const targetedAnyMinion = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "ALL" });

export const targetedAnyCharacter = (): TargetDefinition =>
    baseTarget({ type: "ALL", targetTeam: "ALL" });

export const targetedEnemyMinionWithComparison = (comp: ComparisonDefinition): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "OPPONENT", comparison: comp });

export const targetedEnemyMinionWithTag = (tag: CardTag): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "OPPONENT", tag });

export const randomEnemyTargets = (n: number): TargetDefinition =>
    baseTarget({
        type: "ALL",
        targetTeam: "OPPONENT",
        maxTargets: n,
        targetSelectionMode: "RANDOM",
    });

export const randomEnemyMinion = (): TargetDefinition =>
    baseTarget({
        type: "MINION",
        targetTeam: "OPPONENT",
        maxTargets: 1,
        targetSelectionMode: "RANDOM",
    });

export const randomEnemyCharacter = (): TargetDefinition =>
    baseTarget({
        type: "ALL",
        targetTeam: "OPPONENT",
        maxTargets: 1,
        targetSelectionMode: "RANDOM",
    });

export const otherCharacters = (): TargetDefinition =>
    baseTarget({ type: "ALL", targetTeam: "ALL", excludeSelf: true });

const baseAction = (overrides: Partial<CardActionDefinition>): CardActionDefinition => ({
    type: "DAMAGE",
    isTargeted: false,
    ...nullActionFields(),
    ...overrides,
});

export const damageAction = (
    damage: number,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => baseAction({ type: "DAMAGE", damage, target, isTargeted });

export const healAction = (
    heal: number,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => baseAction({ type: "HEAL", heal, target, isTargeted });

export const drawAction = (
    drawCount: number,
    drawCardFilter: CardActionDefinition["drawCardFilter"] = null,
): CardActionDefinition => baseAction({ type: "DRAW", drawCount, drawCardFilter });

export const enemyDrawAction = (
    enemyDrawCount: number,
    enemyDrawCardFilter: CardActionDefinition["enemyDrawCardFilter"] = null,
): CardActionDefinition => baseAction({ type: "ENEMY_DRAW", enemyDrawCount, enemyDrawCardFilter });

export const boostAction = (
    boost: BoostDefinition,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => baseAction({ type: "BOOST", boost, target, isTargeted });

export const boostStats = (overrides: Partial<BoostDefinition> = {}): BoostDefinition => ({
    attack: null,
    health: null,
    spellPower: null,
    minionPower: null,
    ...overrides,
});

export const boostAttack = (attack: number): BoostDefinition => boostStats({ attack });

export const boostHealth = (health: number): BoostDefinition => boostStats({ health });

export const boostBoth = (attack: number, health: number): BoostDefinition =>
    boostStats({ attack, health });

export const boostSpellPower = (spellPower: number): BoostDefinition => boostStats({ spellPower });

export const boostTaunt = (): BoostDefinition =>
    boostStats({
        minionPower: {
            hasTaunt: true,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: false,
        },
    });

export const boostCharge = (): BoostDefinition =>
    boostStats({
        minionPower: {
            hasTaunt: false,
            hasCharge: true,
            hasWindfury: false,
            isPoisonous: false,
        },
    });

export const boostBothWithTaunt = (attack: number, health: number): BoostDefinition =>
    boostStats({
        attack,
        health,
        minionPower: {
            hasTaunt: true,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: false,
        },
    });

export const boostAttackWithCharge = (attack: number): BoostDefinition =>
    boostStats({
        attack,
        minionPower: {
            hasTaunt: false,
            hasCharge: true,
            hasWindfury: false,
            isPoisonous: false,
        },
    });

export const minionDrawFilter = (
    tags: CardTag[] = [],
    comp: ComparisonDefinition | null = null,
): NonNullable<CardActionDefinition["drawCardFilter"]> => ({
    type: "MINION",
    comparison: comp,
    tags,
});

export const spellDrawFilter = (): NonNullable<CardActionDefinition["drawCardFilter"]> => ({
    type: "SPELL",
    comparison: null,
    tags: [],
});

export const actionPassive = (
    triggersOn: NonNullable<PassiveDefinition["triggersOn"]>,
    action: CardActionDefinition,
): PassiveDefinition => ({
    type: "ACTION",
    triggersOn,
    action,
    passiveBoost: null,
});

export const boostPassive = (
    boost: BoostDefinition,
    target: TargetDefinition,
): PassiveDefinition => ({
    type: "BOOST",
    triggersOn: null,
    action: null,
    passiveBoost: { boost, target },
});

export const defineMinion = (
    cardId: number,
    base: MinionSeedBase,
    dataPartial: Partial<Omit<MinionCardData, "attack" | "health">> = {},
): CardSeedEntry => {
    const data = parseMinionData({
        ...defaultMinionData(),
        name: base.label,
        cost: base.cost,
        imageUrl: base.imageUrl,
        attack: base.attack,
        health: base.health,
        ...dataPartial,
    });

    return {
        id: cardId,
        cardSetName: base.cardSetName,
        data,
    };
};

export const defineSpell = (
    cardId: number,
    base: CardSeedBase,
    action: CardActionDefinition,
    tags: CardTag[] = [],
): CardSeedEntry => {
    const data = parseSpellData({
        schemaVersion: 1,
        type: "SPELL",
        tags,
        name: base.label,
        cost: base.cost,
        imageUrl: base.imageUrl,
        action,
    });

    return {
        id: cardId,
        cardSetName: base.cardSetName,
        data,
    };
};

export const defineWeapon = (
    cardId: number,
    base: CardSeedBase & { damage: number; durability: number },
    dataPartial: Partial<Omit<WeaponCardData, "damage" | "durability">> = {},
): CardSeedEntry => {
    const data = parseWeaponData({
        ...defaultWeaponData(),
        name: base.label,
        cost: base.cost,
        imageUrl: base.imageUrl,
        damage: base.damage,
        durability: base.durability,
        ...dataPartial,
    });

    return {
        id: cardId,
        cardSetName: base.cardSetName,
        data,
    };
};

export const buildCardInsert = (entry: CardSeedEntry, cardSetId: number) => ({
    cardSetId,
    data: parseCardData(entry.data),
});
