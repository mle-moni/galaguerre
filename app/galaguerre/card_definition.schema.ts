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
    maxTargets: z.number().nullable(),
    targetSelectionMode: z.enum(GALAGUERRE_TARGET_SELECTION_MODES).nullable(),
});

export const boostMinionPowerSchema = z.object({
    hasTaunt: z.boolean(),
    hasCharge: z.boolean(),
    hasWindfury: z.boolean(),
    isPoisonous: z.boolean(),
});

export const boostSchema = z.object({
    attack: z.number().nullable(),
    health: z.number().nullable(),
    spellPower: z.number().nullable(),
    minionPower: boostMinionPowerSchema.nullable(),
});

export const cardFilterSchema = z.object({
    type: z.enum(GALAGUERRE_CARD_TYPES),
    comparison: comparisonSchema.nullable(),
    tags: z.array(cardTagSchema),
});

export const cardActionSchema = z
    .object({
        type: z.enum(GALAGUERRE_ACTIONS_TYPES),
        isTargeted: z.boolean(),
        damage: z.number().nullable(),
        heal: z.number().nullable(),
        drawCount: z.number().nullable(),
        enemyDrawCount: z.number().nullable(),
        drawCardFilter: cardFilterSchema.nullable(),
        enemyDrawCardFilter: cardFilterSchema.nullable(),
        boost: boostSchema.nullable(),
        target: targetSchema.nullable(),
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
    })
    .superRefine((passive, ctx) => {
        validatePassiveDefinition(passive, ctx, []);
    });

const cardDataBaseSchema = z.object({
    schemaVersion: z.literal(1),
    tags: z.array(cardTagSchema),
    name: z.string(),
    imageUrl: z.string(),
    cost: z.number().int().min(0),
});

export const minionDataSchema = cardDataBaseSchema.extend({
    type: z.literal("MINION"),
    attack: z.number().int().min(0),
    health: z.number().int().min(1),
    hasTaunt: z.boolean(),
    hasCharge: z.boolean(),
    hasWindfury: z.boolean(),
    isPoisonous: z.boolean(),
    battlecryActions: z.array(cardActionSchema),
    deathrattleActions: z.array(deathrattleActionSchema),
    passives: z.array(passiveSchema),
});

export const spellDataSchema = cardDataBaseSchema.extend({
    type: z.literal("SPELL"),
    action: cardActionSchema,
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
    CardActionDefinition,
    BoostDefinition,
    ComparisonDefinition,
    PassiveDefinition,
    TargetDefinition,
} from "./card_definition.validation.js";

export type BoostMinionPowerDefinition = z.infer<typeof boostMinionPowerSchema>;
export type CardFilterDefinition = z.infer<typeof cardFilterSchema>;
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
