import type { CardActionFieldsDefinition, TargetDefinition } from "../card_definition.schema.js";

export type TargetedCardActionFields = Extract<CardActionFieldsDefinition, { target: unknown }>;

export const hasActionTarget = (
    action: CardActionFieldsDefinition,
): action is TargetedCardActionFields => "target" in action;

export const getActionTarget = (action: CardActionFieldsDefinition): TargetDefinition | null =>
    hasActionTarget(action) ? action.target : null;
