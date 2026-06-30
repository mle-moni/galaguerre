export const V1_ACTION_TYPES = [
    "DAMAGE",
    "HEAL",
    "DRAW",
    "ENEMY_DRAW",
    "BOOST",
    "SILENCE",
    "DESTROY",
    "BREAK_WEAPON",
    "RECONVERSION",
    "MIND_CONTROL",
    "SUMMON",
    "DECK_CARD",
    "HAND_CARD",
    "DISCOVER",
    "MANA",
    "DEFEAT",
] as const;
export type V1ActionType = (typeof V1_ACTION_TYPES)[number];
