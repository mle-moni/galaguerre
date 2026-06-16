import type { CardActionFieldsSnapshot, TargetSnapshot } from "./game.types.js";

export type TargetedCardActionFieldsSnapshot = Extract<
    CardActionFieldsSnapshot,
    { target: unknown }
>;

export const hasActionTarget = (
    action: CardActionFieldsSnapshot,
): action is TargetedCardActionFieldsSnapshot => "target" in action;

export const getActionTarget = (action: CardActionFieldsSnapshot): TargetSnapshot | null =>
    hasActionTarget(action) ? action.target : null;
