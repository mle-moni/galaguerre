export const V1_ACTION_TYPES = ["DAMAGE", "HEAL", "DRAW", "ENEMY_DRAW"] as const;
export type V1ActionType = (typeof V1_ACTION_TYPES)[number];
