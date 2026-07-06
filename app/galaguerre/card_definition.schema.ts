import { z } from "zod";
import { CARD_TAGS } from "./card_tags.js";
import {
    validateCardAction,
    validateComparisonRefinement,
    validatePassiveDefinition,
} from "./card_definition.validation.js";
import {
    GALAGUERRE_CARD_FILTER_TYPES,
    GALAGUERRE_CARD_RARITIES,
    GALAGUERRE_DECK_CARD_OPERATIONS,
    GALAGUERRE_DECK_PLACEMENTS,
    GALAGUERRE_MANA_SUBTYPES,
    GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES,
    GALAGUERRE_DYNAMIC_COST_SOURCES,
    GALAGUERRE_PASSIVES_TRIGGERS_ON,
    GALAGUERRE_PASSIVES_TYPES,
    GALAGUERRE_TARGET_ADJACENCY,
    GALAGUERRE_TARGET_SELECTION_MODES,
    GALAGUERRE_TARGET_TEAMS,
    GALAGUERRE_TARGET_TYPES,
} from "./galaguerre.types.js";

export const cardTagSchema = z.enum(CARD_TAGS);

export const comparisonSchema = z
    .object({
        costComparison: z.enum(["<", ">", "="]).nullable(),
        cost: z.number().nullable(),
        attackComparison: z.enum(["<", ">", "="]).nullable(),
        attack: z.number().nullable(),
        healthComparison: z.enum(["<", ">", "="]).nullable(),
        health: z.number().nullable(),
    })
    .superRefine((comparison, ctx) => {
        validateComparisonRefinement(comparison, ctx, []);
    });

export const targetSchema = z.object({
    type: z.enum(GALAGUERRE_TARGET_TYPES),
    targetTeam: z.enum(GALAGUERRE_TARGET_TEAMS),
    comparison: comparisonSchema.nullable(),
    tag: cardTagSchema.nullable(),
    excludeSelf: z.boolean(),
    onlySelf: z.boolean().default(false),
    maxTargets: z.number().nullable(),
    targetSelectionMode: z.enum(GALAGUERRE_TARGET_SELECTION_MODES).nullable(),
    adjacency: z.enum(GALAGUERRE_TARGET_ADJACENCY).nullable().default(null),
});

export const zMinionPowerSchema = z.object({
    hasTaunt: z.boolean().optional(),
    hasCharge: z.boolean().optional(),
    hasWindfury: z.boolean().optional(),
    isPoisonous: z.boolean().optional(),
    hasStealth: z.boolean().optional(),
    hasDivineShield: z.boolean().optional(),
});

export type MinionPower = z.infer<typeof zMinionPowerSchema>;

export const boostSchema = z.object({
    attack: z.number().nullable(),
    health: z.number().nullable(),
    spellPower: z.number().nullable(),
    minionPowers: zMinionPowerSchema.nullable(),
});

export const cardFilterSchema = z.object({
    type: z.enum(GALAGUERRE_CARD_FILTER_TYPES),
    comparison: comparisonSchema.nullable(),
    tags: z.array(cardTagSchema),
    rarity: z.enum(GALAGUERRE_CARD_RARITIES).nullable().default(null),
});

export const reconvertParametersSchema = cardFilterSchema.extend({
    cardId: z.number().int().positive().nullable().default(null),
    relativeToSource: z.boolean().default(false),
});

export const actionConditionSchema = z
    .object({
        opponentMinionCountMin: z.number().int().positive().nullable().default(null),
    })
    .nullable()
    .default(null);

const targetedActionBaseFields = {
    isTargeted: z.boolean(),
    target: targetSchema.nullable(),
    actionCondition: actionConditionSchema,
};

const damageActionFieldsSchema = z.object({
    type: z.literal("DAMAGE"),
    ...targetedActionBaseFields,
    damage: z.number(),
});

const healActionFieldsSchema = z.object({
    type: z.literal("HEAL"),
    ...targetedActionBaseFields,
    heal: z.number(),
});

const drawActionFieldsSchema = z.object({
    type: z.literal("DRAW"),
    isTargeted: z.literal(false).default(false),
    drawCount: z.number(),
    drawCardFilter: cardFilterSchema.nullable(),
    actionCondition: actionConditionSchema,
});

const enemyDrawActionFieldsSchema = z.object({
    type: z.literal("ENEMY_DRAW"),
    isTargeted: z.literal(false).default(false),
    enemyDrawCount: z.number(),
    enemyDrawCardFilter: cardFilterSchema.nullable(),
    actionCondition: actionConditionSchema,
});

const boostActionFieldsSchema = z.object({
    type: z.literal("BOOST"),
    ...targetedActionBaseFields,
    boost: boostSchema,
});

const silenceActionFieldsSchema = z.object({
    type: z.literal("SILENCE"),
    ...targetedActionBaseFields,
});

const destroyActionFieldsSchema = z.object({
    type: z.literal("DESTROY"),
    ...targetedActionBaseFields,
});

const breakWeaponActionFieldsSchema = z.object({
    type: z.literal("BREAK_WEAPON"),
    ...targetedActionBaseFields,
});

const reconversionActionFieldsSchema = z.object({
    type: z.literal("RECONVERSION"),
    ...targetedActionBaseFields,
    reconvertParameters: reconvertParametersSchema,
});

const mindControlActionFieldsSchema = z.object({
    type: z.literal("MIND_CONTROL"),
    ...targetedActionBaseFields,
});

const summonActionFieldsSchema = z.object({
    type: z.literal("SUMMON"),
    isTargeted: z.literal(false).default(false),
    summonParameters: reconvertParametersSchema,
    summonCount: z.number().int().positive(),
    summonTargetTeam: z.enum(["PLAYER", "OPPONENT"]).default("PLAYER"),
    actionCondition: actionConditionSchema,
});

const deckCardActionFieldsSchema = z.object({
    type: z.literal("DECK_CARD"),
    isTargeted: z.literal(false).default(false),
    deckCardOperation: z.enum(GALAGUERRE_DECK_CARD_OPERATIONS),
    deckPlacement: z.enum(GALAGUERRE_DECK_PLACEMENTS).nullable(),
    deckTargetTeam: z.enum(GALAGUERRE_TARGET_TEAMS).default("PLAYER"),
    cardId: z.number().int().positive(),
    copyCount: z.number().int().positive().nullable(),
    actionCondition: actionConditionSchema,
});

const handCardActionFieldsSchema = z.object({
    type: z.literal("HAND_CARD"),
    isTargeted: z.literal(false).default(false),
    handTargetTeam: z.enum(GALAGUERRE_TARGET_TEAMS).default("PLAYER"),
    cardId: z.number().int().positive(),
    copyCount: z.number().int().positive(),
    actionCondition: actionConditionSchema,
});

const discoverActionFieldsSchema = z.object({
    type: z.literal("DISCOVER"),
    isTargeted: z.literal(false).default(false),
    discoverCardFilter: cardFilterSchema,
    optionCount: z.number().int().positive().default(3),
    actionCondition: actionConditionSchema,
});

const manaAmountScaleSchema = z.object({
    source: z.enum(GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES),
    amountPer: z.number().positive().default(1),
});

const manaActionFieldsSchema = z.object({
    type: z.literal("MANA"),
    isTargeted: z.literal(false).default(false),
    subtype: z.enum(GALAGUERRE_MANA_SUBTYPES),
    amount: z.number().int().positive(),
    amountScale: manaAmountScaleSchema.nullable().default(null),
    actionCondition: actionConditionSchema,
});

const defeatActionSchema = z.object({
    type: z.literal("DEFEAT"),
    isTargeted: z.literal(false).default(false),
    targetTeam: z.enum(GALAGUERRE_TARGET_TEAMS),
    actionCondition: actionConditionSchema,
});

const cardActionFieldsSchema = z.discriminatedUnion("type", [
    damageActionFieldsSchema,
    healActionFieldsSchema,
    drawActionFieldsSchema,
    enemyDrawActionFieldsSchema,
    boostActionFieldsSchema,
    silenceActionFieldsSchema,
    destroyActionFieldsSchema,
    breakWeaponActionFieldsSchema,
    reconversionActionFieldsSchema,
    mindControlActionFieldsSchema,
    summonActionFieldsSchema,
    deckCardActionFieldsSchema,
    handCardActionFieldsSchema,
    discoverActionFieldsSchema,
    manaActionFieldsSchema,
    defeatActionSchema,
]);

export const onTargetResultSchema = z
    .object({
        when: z.enum(["KILLED", "SURVIVED"]),
        healthComparison: comparisonSchema.nullable(),
        action: cardActionFieldsSchema,
    })
    .superRefine((onTargetResult, ctx) => {
        if (onTargetResult.when === "KILLED" && onTargetResult.healthComparison !== null) {
            ctx.addIssue({
                code: "custom",
                message: "KILLED onTargetResult must not set healthComparison",
                path: ["healthComparison"],
            });
        }

        if (onTargetResult.when === "SURVIVED" && onTargetResult.healthComparison !== null) {
            validateComparisonRefinement(onTargetResult.healthComparison, ctx, [
                "healthComparison",
            ]);
        }
    });

const cardActionOnTargetResultField = {
    onTargetResult: onTargetResultSchema.nullable().default(null),
};

export const cardActionSchema = z
    .discriminatedUnion("type", [
        damageActionFieldsSchema.extend(cardActionOnTargetResultField),
        healActionFieldsSchema.extend(cardActionOnTargetResultField),
        drawActionFieldsSchema.extend(cardActionOnTargetResultField),
        enemyDrawActionFieldsSchema.extend(cardActionOnTargetResultField),
        boostActionFieldsSchema.extend(cardActionOnTargetResultField),
        silenceActionFieldsSchema.extend(cardActionOnTargetResultField),
        destroyActionFieldsSchema.extend(cardActionOnTargetResultField),
        breakWeaponActionFieldsSchema.extend(cardActionOnTargetResultField),
        reconversionActionFieldsSchema.extend(cardActionOnTargetResultField),
        mindControlActionFieldsSchema.extend(cardActionOnTargetResultField),
        summonActionFieldsSchema.extend(cardActionOnTargetResultField),
        deckCardActionFieldsSchema.extend(cardActionOnTargetResultField),
        handCardActionFieldsSchema.extend(cardActionOnTargetResultField),
        discoverActionFieldsSchema.extend(cardActionOnTargetResultField),
        manaActionFieldsSchema.extend(cardActionOnTargetResultField),
        defeatActionSchema.extend(cardActionOnTargetResultField),
    ])
    .superRefine((action, ctx) => {
        validateCardAction(action, ctx, [], { allowTargeted: true });
    });

export const deathrattleActionSchema = cardActionSchema.superRefine((action, ctx) => {
    validateCardAction(action, ctx, [], { deathrattle: true });
});

export const passiveBoostSchema = z.object({
    boost: boostSchema,
    target: targetSchema.nullable(),
    scaleToSource: z.boolean().optional(),
});

export const passiveSchema = z
    .object({
        type: z.enum(GALAGUERRE_PASSIVES_TYPES),
        triggersOn: z.enum(GALAGUERRE_PASSIVES_TRIGGERS_ON).nullable(),
        action: cardActionSchema.nullable(),
        passiveBoost: passiveBoostSchema.nullable(),
        playCardFilter: cardFilterSchema.nullable(),
        summonFilter: cardFilterSchema.nullable().default(null),
        triggerTargetFilter: targetSchema.nullable().default(null),
    })
    .superRefine((passive, ctx) => {
        validatePassiveDefinition(passive, ctx, []);
    });

const dynamicCostReductionSchema = z.object({
    source: z.enum(GALAGUERRE_DYNAMIC_COST_SOURCES),
    amountPer: z.number().positive().default(1),
});

export const dynamicCostSchema = z.object({
    reductions: z.array(dynamicCostReductionSchema).min(1),
});

const cardDataBaseSchema = z.object({
    schemaVersion: z.literal(1),
    tags: z.array(cardTagSchema),
    name: z.string(),
    imageUrl: z.string(),
    cost: z.number().int().min(0),
    dynamicCost: dynamicCostSchema.nullable(),
});

export const minionDataSchema = cardDataBaseSchema.extend({
    type: z.literal("MINION"),
    attack: z.number().int().min(0),
    health: z.number().int().min(1),
    minionPowers: zMinionPowerSchema.nullable(),
    battlecryActions: z.array(cardActionSchema),
    deathrattleActions: z.array(deathrattleActionSchema),
    passives: z.array(passiveSchema),
});

export const spellDataSchema = cardDataBaseSchema.extend({
    type: z.literal("SPELL"),
    spellActions: z.array(cardActionSchema).min(1),
    castsWhenDrawn: z.boolean().default(false),
});

export const weaponDataSchema = cardDataBaseSchema.extend({
    type: z.literal("WEAPON"),
    damage: z.number().int().min(0),
    durability: z.number().int().min(1),
    deathrattleActions: z.array(deathrattleActionSchema),
});

export const cardDataSchema = z.discriminatedUnion("type", [
    minionDataSchema,
    spellDataSchema,
    weaponDataSchema,
]);

export type { CardTag } from "./card_tags.js";
export type {
    ActionConditionDefinition,
    BoostDefinition,
    ComparisonDefinition,
    PassiveDefinition,
    TargetDefinition,
} from "./card_definition.validation.js";

export type CardActionFieldsDefinition = z.infer<typeof cardActionFieldsSchema>;
export type OnTargetResultDefinition = z.infer<typeof onTargetResultSchema>;
export type CardActionDefinition = z.infer<typeof cardActionSchema>;

export type DynamicCostDefinition = z.infer<typeof dynamicCostSchema>;
export type CardFilterDefinition = z.infer<typeof cardFilterSchema>;
export type ReconvertParametersDefinition = z.infer<typeof reconvertParametersSchema>;
export type DeathrattleActionDefinition = z.infer<typeof deathrattleActionSchema>;
export type PassiveBoostDefinition = z.infer<typeof passiveBoostSchema>;
export type MinionCardData = z.infer<typeof minionDataSchema>;
export type SpellCardData = z.infer<typeof spellDataSchema>;
export type WeaponCardData = z.infer<typeof weaponDataSchema>;
export type CardData = z.infer<typeof cardDataSchema>;

export type GalaguerreCardType = CardData["type"];

export const parseMinionData = (data: unknown) => minionDataSchema.parse(data);
export const parseSpellData = (data: unknown) => spellDataSchema.parse(data);
export const parseWeaponData = (data: unknown) => weaponDataSchema.parse(data);

export const parseCardData = (data: unknown): CardData => cardDataSchema.parse(data);

export const safeParseCardData = (data: unknown) => cardDataSchema.safeParse(data);
