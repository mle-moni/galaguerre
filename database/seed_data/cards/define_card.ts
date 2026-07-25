import type { CardRarity } from "#api_types/card_rarity.types";
import type { CardLabelTag } from "#galaguerre/card_label_tags";
import type { CardTag } from "#galaguerre/card_tags";
import type {
    CardActionDefinition,
    CardActionFieldsDefinition,
    ActionConditionDefinition,
    BoostDefinition,
    CardFilterDefinition,
    ComparisonDefinition,
    OnTargetResultDefinition,
    PassiveDefinition,
    ReconvertParametersDefinition,
    TargetDefinition,
} from "#galaguerre/card_definition.schema";
import type {
    CardData,
    DynamicCostDefinition,
    MinionCardData,
    SpellCardData,
    WeaponCardData,
} from "#galaguerre/card_definition.schema";
import type { GalaguerreDeckPlacement, GalaguerreTargetTeam } from "#galaguerre/galaguerre.types";
import {
    parseCardData,
    parseMinionData,
    parseSpellData,
    parseWeaponData,
} from "#galaguerre/card_definition.schema";
export type CardSeedOptions = {
    isCollectible?: boolean;
    rarity?: CardRarity;
};

export type CardSeedEntry = {
    id: number;
    cardSetName: string;
    data: CardData;
    isCollectible?: boolean;
    rarity?: CardRarity;
};

type CardSeedBase = {
    label: string;
    cost: number;
    imageUrl: string;
    goldenVideoUrl?: string | null;
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

const defaultActionCondition = (): ActionConditionDefinition | null => null;

export const damageAction = (
    damage: number,
    target: TargetDefinition,
    isTargeted = false,
    options: { onTargetResult?: OnTargetResultDefinition | null } = {},
): CardActionDefinition => ({
    type: "DAMAGE",
    damage,
    target,
    isTargeted,
    actionCondition: defaultActionCondition(),
    onTargetResult: options.onTargetResult ?? null,
});

export const onTargetKilled = (action: CardActionFieldsDefinition): OnTargetResultDefinition => ({
    when: "KILLED",
    healthComparison: null,
    action,
});

export const onTargetSurvivedWithHealth = (
    healthComparison: ComparisonDefinition,
    action: CardActionFieldsDefinition,
): OnTargetResultDefinition => ({
    when: "SURVIVED",
    healthComparison,
    action,
});

export const healAction = (
    heal: number,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => ({
    type: "HEAL",
    heal,
    target,
    isTargeted,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const drawAction = (
    drawCount: number,
    drawCardFilter: CardFilterDefinition | null = null,
): CardActionDefinition => ({
    type: "DRAW",
    isTargeted: false,
    drawCount,
    drawCardFilter,
    drawCardFilterAlternatives: [],
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const drawOrAction = (
    drawCount: number,
    filters: CardFilterDefinition[],
): CardActionDefinition => ({
    type: "DRAW",
    isTargeted: false,
    drawCount,
    drawCardFilter: null,
    drawCardFilterAlternatives: filters,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const generateHandAction = (
    generateCount: number,
    generateCardFilter: CardFilterDefinition | null = null,
): CardActionDefinition => ({
    type: "GENERATE_HAND",
    isTargeted: false,
    generateCount,
    generateCardFilter,
    generateCardFilterAlternatives: [],
    handTargetTeam: "PLAYER",
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const generateHandOrAction = (
    generateCount: number,
    filters: CardFilterDefinition[],
): CardActionDefinition => ({
    type: "GENERATE_HAND",
    isTargeted: false,
    generateCount,
    generateCardFilter: null,
    generateCardFilterAlternatives: filters,
    handTargetTeam: "PLAYER",
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const enemyDrawAction = (
    enemyDrawCount: number,
    enemyDrawCardFilter: CardFilterDefinition | null = null,
): CardActionDefinition => ({
    type: "ENEMY_DRAW",
    isTargeted: false,
    enemyDrawCount,
    enemyDrawCardFilter,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const discoverAction = (
    discoverCardFilter: CardFilterDefinition,
    options: { optionCount?: number } = {},
): CardActionDefinition => ({
    type: "DISCOVER",
    isTargeted: false,
    discoverCardFilter,
    discoverCardFilterAlternatives: [],
    optionCount: options.optionCount ?? 3,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const discoverOrAction = (
    filters: CardFilterDefinition[],
    options: { optionCount?: number } = {},
): CardActionDefinition => ({
    type: "DISCOVER",
    isTargeted: false,
    discoverCardFilter: null,
    discoverCardFilterAlternatives: filters,
    optionCount: options.optionCount ?? 3,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const manaTemporaryChangeAction = (amount: number): CardActionDefinition => ({
    type: "MANA",
    isTargeted: false,
    subtype: "TEMPORARY_CHANGE",
    amount,
    amountScale: null,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const nextSpellCostReductionAction = (amount: number): CardActionDefinition => ({
    type: "NEXT_SPELL_COST_REDUCTION",
    isTargeted: false,
    amount,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const defeatAction = (
    targetTeam: GalaguerreTargetTeam = "OPPONENT",
): CardActionDefinition => ({
    type: "DEFEAT",
    isTargeted: false,
    targetTeam,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const manaTemporaryChangePerOpponentMinionAction = (
    amountPer = 1,
): CardActionDefinition => ({
    type: "MANA",
    isTargeted: false,
    subtype: "TEMPORARY_CHANGE",
    amount: amountPer,
    amountScale: { source: "OPPONENT_MINION_COUNT", amountPer },
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const boostAction = (
    boost: BoostDefinition,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => ({
    type: "BOOST",
    boost,
    target,
    isTargeted,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const silenceAction = (
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => ({
    type: "SILENCE",
    target,
    isTargeted,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const destroyAction = (
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => ({
    type: "DESTROY",
    target,
    isTargeted,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const breakWeaponAction = (
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => ({
    type: "BREAK_WEAPON",
    target,
    isTargeted,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const mindControlAction = (
    target: TargetDefinition,
    isTargeted = false,
    options: { condition?: ActionConditionDefinition | null } = {},
): CardActionDefinition => ({
    type: "MIND_CONTROL",
    target,
    isTargeted,
    actionCondition: options.condition ?? defaultActionCondition(),
    onTargetResult: null,
});

export const returnToHandAction = (
    costReduction: number,
    target: TargetDefinition = targetedAllyMinion(),
    isTargeted = true,
): CardActionDefinition => ({
    type: "RETURN_TO_HAND",
    target,
    isTargeted,
    costReduction,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const reconvertParameters = (
    overrides: Partial<ReconvertParametersDefinition> = {},
): ReconvertParametersDefinition => ({
    type: "MINION",
    comparison: null,
    tags: [],
    labelTags: [],
    rarity: null,
    cardId: null,
    relativeToSource: false,
    ...overrides,
});

export const reconversionAction = (
    parameters: ReconvertParametersDefinition,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => ({
    type: "RECONVERSION",
    reconvertParameters: parameters,
    target,
    isTargeted,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const reconversionToCardId = (
    cardId: number,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition => reconversionAction(reconvertParameters({ cardId }), target, isTargeted);

export const summonAction = (
    parameters: ReconvertParametersDefinition,
    options: { count?: number; targetTeam?: "PLAYER" | "OPPONENT" } = {},
): CardActionDefinition => ({
    type: "SUMMON",
    isTargeted: false,
    summonParameters: parameters,
    summonCount: options.count ?? 1,
    summonTargetTeam: options.targetTeam ?? "PLAYER",
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const summonCardId = (
    cardId: number,
    count = 1,
    targetTeam: "PLAYER" | "OPPONENT" = "PLAYER",
): CardActionDefinition => summonAction(reconvertParameters({ cardId }), { count, targetTeam });

export const summonRandomMinionFromHandAction = (
    targetTeam: "PLAYER" | "OPPONENT" = "OPPONENT",
    count = 1,
): CardActionDefinition => ({
    type: "SUMMON_FROM_HAND",
    isTargeted: false,
    summonTargetTeam: targetTeam,
    handCardFilter: minionDrawFilter(),
    summonCount: count,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

type DeckCardActionOptions = {
    placement?: GalaguerreDeckPlacement;
    targetTeam?: GalaguerreTargetTeam;
};

export const deckCardAddAction = (
    cardId: number,
    copyCount = 1,
    options: DeckCardActionOptions = {},
): CardActionDefinition => ({
    type: "DECK_CARD",
    isTargeted: false,
    target: null,
    deckCardOperation: "ADD",
    deckPlacement: options.placement ?? "RANDOM",
    deckTargetTeam: options.targetTeam ?? "PLAYER",
    cardId,
    copyCount,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const deckCardAddFromTargetAction = (
    copyCount = 1,
    target: TargetDefinition,
    options: DeckCardActionOptions = {},
): CardActionDefinition => ({
    type: "DECK_CARD",
    isTargeted: true,
    target,
    deckCardOperation: "ADD",
    deckPlacement: options.placement ?? "RANDOM",
    deckTargetTeam: options.targetTeam ?? "PLAYER",
    cardId: null,
    copyCount,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const deckCardDeleteAction = (
    cardId: number,
    copyCount: number | null = 1,
    options: DeckCardActionOptions = {},
): CardActionDefinition => ({
    type: "DECK_CARD",
    isTargeted: false,
    target: null,
    deckCardOperation: "DELETE",
    deckPlacement: copyCount === null ? null : options.placement ?? "RANDOM",
    deckTargetTeam: options.targetTeam ?? "PLAYER",
    cardId,
    copyCount,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const deckCardDeleteAllAction = (
    cardId: number,
    options: Omit<DeckCardActionOptions, "placement"> = {},
): CardActionDefinition => deckCardDeleteAction(cardId, null, options);

export const deckCardDeleteAddedAction = (
    options: Omit<DeckCardActionOptions, "placement"> = {},
): CardActionDefinition => ({
    type: "DECK_CARD",
    isTargeted: false,
    target: null,
    deckCardOperation: "DELETE_ADDED",
    deckPlacement: null,
    deckTargetTeam: options.targetTeam ?? "ALL",
    cardId: null,
    copyCount: null,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

type HandCardActionOptions = {
    targetTeam?: GalaguerreTargetTeam;
};

export const handCardAddAction = (
    cardId: number,
    copyCount = 1,
    options: HandCardActionOptions = {},
): CardActionDefinition => ({
    type: "HAND_CARD",
    isTargeted: false,
    handTargetTeam: options.targetTeam ?? "PLAYER",
    cardId,
    copyCount,
    actionCondition: defaultActionCondition(),
    onTargetResult: null,
});

export const defaultMinionData = (): MinionCardData => ({
    schemaVersion: 1,
    type: "MINION",
    tags: [],
    labelTags: [],
    name: "Test Card",
    cost: 1,
    dynamicCost: null,
    imageUrl: "https://example.com/card.png",
    goldenVideoUrl: null,
    attack: 1,
    health: 1,
    minionPowers: null,
    battlecryActions: [],
    comboActions: [],
    deathrattleActions: [],
    attackActions: [],
    passives: [],
});

export const defaultSpellData = (): SpellCardData => ({
    schemaVersion: 1,
    type: "SPELL",
    tags: [],
    labelTags: [],
    name: "Test Card",
    cost: 1,
    dynamicCost: null,
    imageUrl: "https://example.com/card.png",
    goldenVideoUrl: null,
    spellActions: [damageAction(1, enemyHero())],
    castsWhenDrawn: false,
});

export const defaultWeaponData = (): WeaponCardData => ({
    schemaVersion: 1,
    type: "WEAPON",
    tags: [],
    labelTags: [],
    name: "Test Card",
    cost: 1,
    dynamicCost: null,
    imageUrl: "https://example.com/card.png",
    goldenVideoUrl: null,
    damage: 1,
    durability: 1,
    deathrattleActions: [],
    cannotAttackHero: false,
});

export const dynamicCostPerHandCard = (amountPer = 1): DynamicCostDefinition => ({
    reductions: [{ source: "HAND_CARD_COUNT", amountPer }],
});

export const dynamicCostPerBoardMinion = (amountPer = 1): DynamicCostDefinition => ({
    reductions: [{ source: "BOARD_MINION_COUNT", amountPer }],
});

export const dynamicCostPerHeroMissingHealth = (amountPer = 1): DynamicCostDefinition => ({
    reductions: [{ source: "HERO_MISSING_HEALTH", amountPer }],
});

export const comparison = (overrides: Partial<ComparisonDefinition>): ComparisonDefinition => ({
    ...nullComparison(),
    ...overrides,
});

export const attackGreaterThan = (attack: number): ComparisonDefinition =>
    comparison({ attackComparison: ">", attack });

export const attackAtMost = (maxAttack: number): ComparisonDefinition =>
    comparison({ attackComparison: "<", attack: maxAttack + 1 });

export const healthLessThan = (health: number): ComparisonDefinition =>
    comparison({ healthComparison: "<", health });

export const healthEquals = (health: number): ComparisonDefinition =>
    comparison({ healthComparison: "=", health });

export const costEquals = (cost: number): ComparisonDefinition =>
    comparison({ costComparison: "=", cost });

export const costLessThan = (cost: number): ComparisonDefinition =>
    comparison({ costComparison: "<", cost });

export const costMoreThan = (cost: number): ComparisonDefinition =>
    comparison({ costComparison: ">", cost });

export const randomCostReconversion = (
    cost: number,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition =>
    reconversionAction(reconvertParameters({ comparison: costEquals(cost) }), target, isTargeted);

export const relativeCostReconversion = (
    costOffset: number,
    target: TargetDefinition,
    isTargeted = false,
): CardActionDefinition =>
    reconversionAction(
        reconvertParameters({
            comparison: costEquals(costOffset),
            relativeToSource: true,
        }),
        target,
        isTargeted,
    );

const baseTarget = (overrides: Partial<TargetDefinition>): TargetDefinition => ({
    type: "HERO",
    targetTeam: "OPPONENT",
    comparison: null,
    tag: null,
    excludeSelf: false,
    onlySelf: false,
    maxTargets: null,
    targetSelectionMode: null,
    adjacency: null,
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

export const adjacentAllyMinions = (): TargetDefinition =>
    baseTarget({
        type: "MINION",
        targetTeam: "PLAYER",
        adjacency: "SOURCE",
        excludeSelf: true,
    });

export const adjacentToSelectedTargetEnemyMinions = (): TargetDefinition =>
    baseTarget({
        type: "MINION",
        targetTeam: "OPPONENT",
        adjacency: "SELECTED_TARGET",
    });

export const adjacentToSelectedTargetAllyMinions = (): TargetDefinition =>
    baseTarget({
        type: "MINION",
        targetTeam: "PLAYER",
        adjacency: "SELECTED_TARGET",
    });

export const selfMinion = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER", onlySelf: true });

export const otherAllyMinionsWithTag = (tag: CardTag): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER", tag, excludeSelf: true });

export const otherMinionsWithTag = (tag: CardTag): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "ALL", tag, excludeSelf: true });

export const targetedEnemyHero = (): TargetDefinition =>
    baseTarget({ type: "HERO", targetTeam: "OPPONENT" });

export const targetedEnemyMinion = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "OPPONENT" });

export const targetedAllyMinion = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER" });

export const targetedAllyMinionWithComparison = (comp: ComparisonDefinition): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "PLAYER", comparison: comp });

export const targetedAnyMinion = (): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "ALL" });

export const targetedAnyCharacter = (): TargetDefinition =>
    baseTarget({ type: "ALL", targetTeam: "ALL" });

export const targetedEnemyMinionWithComparison = (comp: ComparisonDefinition): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "OPPONENT", comparison: comp });

export const targetedAnyMinionWithComparison = (comp: ComparisonDefinition): TargetDefinition =>
    baseTarget({ type: "MINION", targetTeam: "ALL", comparison: comp });

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

export const randomEnemyMinions = (n: number): TargetDefinition =>
    baseTarget({
        type: "MINION",
        targetTeam: "OPPONENT",
        maxTargets: n,
        targetSelectionMode: "RANDOM",
    });

export const randomEnemyCharacter = (): TargetDefinition =>
    baseTarget({
        type: "ALL",
        targetTeam: "OPPONENT",
        maxTargets: 1,
        targetSelectionMode: "RANDOM",
    });

export const randomAllyMinionWithTag = (tag: CardTag): TargetDefinition =>
    baseTarget({
        type: "MINION",
        targetTeam: "PLAYER",
        tag,
        maxTargets: 1,
        targetSelectionMode: "RANDOM",
    });

export const otherCharacters = (): TargetDefinition =>
    baseTarget({ type: "ALL", targetTeam: "ALL", excludeSelf: true });

export const boostStats = (overrides: Partial<BoostDefinition> = {}): BoostDefinition => ({
    attack: null,
    health: null,
    spellPower: null,
    extraBattlecryTriggers: null,
    minionPowers: null,
    ...overrides,
});

export const boostAttack = (attack: number): BoostDefinition => boostStats({ attack });

export const boostHealth = (health: number): BoostDefinition => boostStats({ health });

export const boostBoth = (attack: number, health: number): BoostDefinition =>
    boostStats({ attack, health });

export const boostSpellPower = (spellPower: number): BoostDefinition => boostStats({ spellPower });

export const boostExtraBattlecryTriggers = (count: number): BoostDefinition =>
    boostStats({ extraBattlecryTriggers: count });

export const boostTaunt = (): BoostDefinition =>
    boostStats({
        minionPowers: {
            hasTaunt: true,
            hasCharge: false,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
    });

export const boostCharge = (): BoostDefinition =>
    boostStats({
        minionPowers: {
            hasTaunt: false,
            hasCharge: true,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
    });

export const boostRush = (): BoostDefinition =>
    boostStats({
        minionPowers: {
            hasTaunt: false,
            hasCharge: false,
            hasRush: true,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
    });

export const boostBothWithTaunt = (attack: number, health: number): BoostDefinition =>
    boostStats({
        attack,
        health,
        minionPowers: {
            hasTaunt: true,
            hasCharge: false,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
    });

export const boostAttackWithCharge = (attack: number): BoostDefinition =>
    boostStats({
        attack,
        minionPowers: {
            hasTaunt: false,
            hasCharge: true,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
    });

export const boostAttackWithStealth = (attack: number): BoostDefinition =>
    boostStats({
        attack,
        minionPowers: { hasStealth: true },
    });

export const boostDivineShield = (): BoostDefinition =>
    boostStats({
        minionPowers: { hasDivineShield: true },
    });

export const boostAttackWithDivineShield = (attack: number): BoostDefinition =>
    boostStats({
        attack,
        minionPowers: { hasDivineShield: true },
    });

export const boostStealth = (): BoostDefinition =>
    boostStats({
        minionPowers: { hasStealth: true },
    });

export const minionDrawFilter = (
    tags: CardTag[] = [],
    comp: ComparisonDefinition | null = null,
): CardFilterDefinition => ({
    type: "MINION",
    comparison: comp,
    tags,
    labelTags: [],
    rarity: null,
});

export const minionDiscoverFilter = (
    options: {
        rarity?: CardRarity;
        tags?: CardTag[];
        comparison?: ComparisonDefinition | null;
    } = {},
): CardFilterDefinition => ({
    type: "MINION",
    comparison: options.comparison ?? null,
    tags: options.tags ?? [],
    labelTags: [],
    rarity: options.rarity ?? null,
});

export const spellDrawFilter = (): CardFilterDefinition => ({
    type: "SPELL",
    comparison: null,
    tags: [],
    labelTags: [],
    rarity: null,
});

export const spellDiscoverFilter = (
    options: {
        labelTags?: CardLabelTag[];
        tags?: CardTag[];
        comparison?: ComparisonDefinition | null;
    } = {},
): CardFilterDefinition => ({
    type: "SPELL",
    comparison: options.comparison ?? null,
    tags: options.tags ?? [],
    labelTags: options.labelTags ?? [],
    rarity: null,
});

export const cardDrawFilter = (
    comp: ComparisonDefinition | null = null,
    tags: CardTag[] = [],
): CardFilterDefinition => ({
    type: "ANY",
    comparison: comp,
    tags,
    labelTags: [],
    rarity: null,
});

export const actionPassive = (
    triggersOn: NonNullable<PassiveDefinition["triggersOn"]>,
    action: CardActionDefinition,
    playCardFilter: CardFilterDefinition | null = null,
    triggerTargetFilter: TargetDefinition | null = null,
    summonFilter: CardFilterDefinition | null = null,
): PassiveDefinition => ({
    type: "ACTION",
    triggersOn,
    action,
    passiveBoost: null,
    playCardFilter,
    summonFilter,
    triggerTargetFilter,
});

export const boostPassive = (
    boost: BoostDefinition,
    target: TargetDefinition,
    scaleToSource = false,
): PassiveDefinition => ({
    type: "BOOST",
    triggersOn: null,
    action: null,
    passiveBoost: { boost, target, scaleToSource },
    playCardFilter: null,
    summonFilter: null,
    triggerTargetFilter: null,
});

export const boostAdjacentAlliesAction = (boost: BoostDefinition): CardActionDefinition =>
    boostAction(boost, adjacentAllyMinions(), false);

export const targetedDamageWithAdjacentEnemySplash = (
    primaryDamage: number,
    splashDamage: number,
): CardActionDefinition[] => [
    damageAction(primaryDamage, targetedEnemyMinion(), true),
    damageAction(splashDamage, adjacentToSelectedTargetEnemyMinions(), false),
];

export const adjacentAllyAuraPassive = (boost: BoostDefinition): PassiveDefinition =>
    boostPassive(boost, adjacentAllyMinions());

export const defineMinion = (
    cardId: number,
    base: MinionSeedBase,
    dataPartial: Partial<Omit<MinionCardData, "attack" | "health">> = {},
    options: CardSeedOptions = {},
): CardSeedEntry => {
    const data = parseMinionData({
        ...defaultMinionData(),
        name: base.label,
        cost: base.cost,
        imageUrl: base.imageUrl,
        goldenVideoUrl: base.goldenVideoUrl ?? null,
        attack: base.attack,
        health: base.health,
        ...dataPartial,
    });

    return {
        id: cardId,
        cardSetName: base.cardSetName,
        data,
        isCollectible: options.isCollectible,
        rarity: options.rarity,
    };
};

export const defineSpell = (
    cardId: number,
    base: CardSeedBase,
    spellActions: CardActionDefinition[],
    tags: CardTag[] = [],
    options: CardSeedOptions = {},
    dataPartial: Partial<Omit<SpellCardData, "spellActions">> = {},
): CardSeedEntry => {
    const data = parseSpellData({
        ...defaultSpellData(),
        tags,
        name: base.label,
        cost: base.cost,
        imageUrl: base.imageUrl,
        goldenVideoUrl: base.goldenVideoUrl ?? null,
        spellActions,
        ...dataPartial,
    });

    return {
        id: cardId,
        cardSetName: base.cardSetName,
        data,
        isCollectible: options.isCollectible,
        rarity: options.rarity,
    };
};

export const defineWeapon = (
    cardId: number,
    base: CardSeedBase & { damage: number; durability: number },
    dataPartial: Partial<Omit<WeaponCardData, "damage" | "durability">> = {},
    options: CardSeedOptions = {},
): CardSeedEntry => {
    const data = parseWeaponData({
        ...defaultWeaponData(),
        name: base.label,
        cost: base.cost,
        imageUrl: base.imageUrl,
        goldenVideoUrl: base.goldenVideoUrl ?? null,
        damage: base.damage,
        durability: base.durability,
        ...dataPartial,
    });

    return {
        id: cardId,
        cardSetName: base.cardSetName,
        data,
        isCollectible: options.isCollectible,
        rarity: options.rarity,
    };
};

export const buildCardInsert = (entry: CardSeedEntry, cardSetId: number) => ({
    cardSetId,
    data: parseCardData(entry.data),
    isCollectible: entry.isCollectible ?? true,
    rarity: entry.rarity ?? "COMMON",
});
