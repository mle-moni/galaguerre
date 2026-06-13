import {
    type GenerateTypeFromEnum,
    type LabelObjectType,
    generateOptionsFromLabelObj,
    generateTypeObjectFromEnum,
} from "./string_enums.js";

export const GALAGUERRE_COMPARISONS = ["<", ">", "="] as const;
export type GalaguerreComparisonType = GenerateTypeFromEnum<typeof GALAGUERRE_COMPARISONS>;
export const GALAGUERRE_COMPARISONS_OBJ = generateTypeObjectFromEnum(GALAGUERRE_COMPARISONS);
export const GALAGUERRE_COMPARISONS_LABEL_OBJ: LabelObjectType<GalaguerreComparisonType> = {
    "<": "<",
    "=": "=",
    ">": ">",
};
export const GALAGUERRE_COMPARISONS_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_COMPARISONS_LABEL_OBJ,
);

export const GALAGUERRE_CARD_TYPES = ["MINION", "SPELL", "WEAPON"] as const;
export type GalaguerreCardType = GenerateTypeFromEnum<typeof GALAGUERRE_CARD_TYPES>;
export const GALAGUERRE_CARD_TYPES_OBJ = generateTypeObjectFromEnum(GALAGUERRE_CARD_TYPES);
export const GALAGUERRE_CARD_TYPES_LABEL_OBJ: LabelObjectType<GalaguerreCardType> = {
    MINION: "Monstre",
    SPELL: "Sort",
    WEAPON: "Arme",
};
export const GALAGUERRE_CARD_TYPES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_CARD_TYPES_LABEL_OBJ,
);

export const GALAGUERRE_ACTIONS_TYPES = [
    "DAMAGE",
    "HEAL",
    "BOOST",
    "DRAW",
    "ENEMY_DRAW",
    "SILENCE",
] as const;
export type GalaguerreActionType = GenerateTypeFromEnum<typeof GALAGUERRE_ACTIONS_TYPES>;
export const GALAGUERRE_ACTIONS_TYPES_OBJ = generateTypeObjectFromEnum(GALAGUERRE_ACTIONS_TYPES);
export const GALAGUERRE_ACTIONS_TYPES_LABEL_OBJ: LabelObjectType<GalaguerreActionType> = {
    BOOST: "Boost",
    DAMAGE: "Damage",
    DRAW: "Draw",
    ENEMY_DRAW: "Enemy Draw",
    HEAL: "Heal",
    SILENCE: "Silence",
};
export const GALAGUERRE_ACTIONS_TYPES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_ACTIONS_TYPES_LABEL_OBJ,
);

export const GALAGUERRE_PASSIVES_TYPES = ["ACTION", "BOOST"] as const;
export type GalaguerrePassiveType = GenerateTypeFromEnum<typeof GALAGUERRE_PASSIVES_TYPES>;
export const GALAGUERRE_PASSIVES_TYPES_OBJ = generateTypeObjectFromEnum(GALAGUERRE_PASSIVES_TYPES);
export const GALAGUERRE_PASSIVES_TYPES_LABEL_OBJ: LabelObjectType<GalaguerrePassiveType> = {
    ACTION: "Action",
    BOOST: "Boost",
};
export const GALAGUERRE_PASSIVES_TYPES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_PASSIVES_TYPES_LABEL_OBJ,
);

export const GALAGUERRE_PASSIVES_TRIGGERS_ON = ["TURN_END", "TURN_BEGIN", "DRAW", "HEAL"] as const;
export type GalaguerrePassiveTriggersOn = GenerateTypeFromEnum<
    typeof GALAGUERRE_PASSIVES_TRIGGERS_ON
>;
export const GALAGUERRE_PASSIVES_TRIGGERS_ON_OBJ = generateTypeObjectFromEnum(
    GALAGUERRE_PASSIVES_TRIGGERS_ON,
);
export const GALAGUERRE_PASSIVES_TRIGGERS_ON_LABEL_OBJ: LabelObjectType<GalaguerrePassiveTriggersOn> =
    {
        DRAW: "Draw",
        HEAL: "Heal",
        TURN_BEGIN: "Turn Begin",
        TURN_END: "Turn End",
    };
export const GALAGUERRE_PASSIVES_TRIGGERS_ON_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_PASSIVES_TRIGGERS_ON_LABEL_OBJ,
);

export const GALAGUERRE_TARGET_TYPES = ["ALL", "HERO", "MINION"] as const;
export type GalaguerreTargetType = GenerateTypeFromEnum<typeof GALAGUERRE_TARGET_TYPES>;
export const GALAGUERRE_TARGET_TYPES_OBJ = generateTypeObjectFromEnum(GALAGUERRE_TARGET_TYPES);
export const GALAGUERRE_TARGET_TYPES_LABEL_OBJ: LabelObjectType<GalaguerreTargetType> = {
    ALL: "All",
    HERO: "Hero",
    MINION: "Monstre",
};
export const GALAGUERRE_TARGET_TYPES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_TARGET_TYPES_LABEL_OBJ,
);

export const GALAGUERRE_TARGET_TEAMS = ["PLAYER", "OPPONENT", "ALL"] as const;
export type GalaguerreTargetTeam = GenerateTypeFromEnum<typeof GALAGUERRE_TARGET_TEAMS>;
export const GALAGUERRE_TARGET_TEAMS_OBJ = generateTypeObjectFromEnum(GALAGUERRE_TARGET_TEAMS);
export const GALAGUERRE_TARGET_TEAMS_LABEL_OBJ: LabelObjectType<GalaguerreTargetTeam> = {
    PLAYER: "Player",
    OPPONENT: "Opponent",
    ALL: "All",
};
export const GALAGUERRE_TARGET_TEAMS_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_TARGET_TEAMS_LABEL_OBJ,
);

export const GALAGUERRE_TARGET_SELECTION_MODES = ["RANDOM"] as const;
export type GalaguerreTargetSelectionMode = GenerateTypeFromEnum<
    typeof GALAGUERRE_TARGET_SELECTION_MODES
>;
export const GALAGUERRE_TARGET_SELECTION_MODES_OBJ = generateTypeObjectFromEnum(
    GALAGUERRE_TARGET_SELECTION_MODES,
);
export const GALAGUERRE_TARGET_SELECTION_MODES_LABEL_OBJ: LabelObjectType<GalaguerreTargetSelectionMode> =
    {
        RANDOM: "Random",
    };
export const GALAGUERRE_TARGET_SELECTION_MODES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_TARGET_SELECTION_MODES_LABEL_OBJ,
);
