import { z } from "zod";
import { CARD_TAGS } from "./card_tags.js";
import {
    validateCardAction,
    validateComparisonRefinement,
    validatePassiveDefinition,
} from "./card_definition.validation.js";
import {
    GALAGUERRE_ACTIONS_TYPES,
    GALAGUERRE_CARD_TYPES,
    GALAGUERRE_DYNAMIC_COST_SOURCES,
    GALAGUERRE_PASSIVES_TRIGGERS_ON,
    GALAGUERRE_PASSIVES_TYPES,
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
    type: z.enum(GALAGUERRE_CARD_TYPES),
    comparison: comparisonSchema.nullable(),
    tags: z.array(cardTagSchema),
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

const cardActionFieldsSchema = z.object({
    type: z.enum(GALAGUERRE_ACTIONS_TYPES),
    isTargeted: z.boolean(),
    damage: z.number().nullable(),
    heal: z.number().nullable(),
    drawCount: z.number().nullable(),
    enemyDrawCount: z.number().nullable(),
    drawCardFilter: cardFilterSchema.nullable(),
    enemyDrawCardFilter: cardFilterSchema.nullable(),
    boost: boostSchema.nullable(),
    reconvertParameters: reconvertParametersSchema.nullable().default(null),
    target: targetSchema.nullable(),
    actionCondition: actionConditionSchema,
});

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

export const cardActionSchema = cardActionFieldsSchema
    .extend({
        onTargetResult: onTargetResultSchema.nullable().default(null),
    })
    .superRefine((action, ctx) => {
        validateCardAction(action, ctx, [], { allowTargeted: true });
    });

export const deathrattleActionSchema = cardActionSchema.superRefine((action, ctx) => {
    validateCardAction(action, ctx, [], { deathrattle: true });
});

export const passiveBoostSchema = z.object({
    boost: boostSchema,
    target: targetSchema.nullable(),
});

export const passiveSchema = z
    .object({
        type: z.enum(GALAGUERRE_PASSIVES_TYPES),
        triggersOn: z.enum(GALAGUERRE_PASSIVES_TRIGGERS_ON).nullable(),
        action: cardActionSchema.nullable(),
        passiveBoost: passiveBoostSchema.nullable(),
        playCardFilter: cardFilterSchema.nullable(),
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
    CardActionDefinition,
    CardActionFieldsDefinition,
    BoostDefinition,
    ComparisonDefinition,
    OnTargetResultDefinition,
    PassiveDefinition,
    TargetDefinition,
} from "./card_definition.validation.js";

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
