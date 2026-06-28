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

export const GALAGUERRE_MANA_SUBTYPES = ["TEMPORARY_CHANGE"] as const;
export type GalaguerreManaSubtype = GenerateTypeFromEnum<typeof GALAGUERRE_MANA_SUBTYPES>;

export const GALAGUERRE_ACTIONS_TYPES = [
    "DAMAGE",
    "HEAL",
    "BOOST",
    "DRAW",
    "ENEMY_DRAW",
    "SILENCE",
    "DESTROY",
    "BREAK_WEAPON",
    "RECONVERSION",
    "MIND_CONTROL",
    "SUMMON",
    "DECK_CARD",
    "HAND_CARD",
    "MANA",
    "DEFEAT",
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
    DESTROY: "Destroy",
    BREAK_WEAPON: "Break Weapon",
    RECONVERSION: "Reconversion",
    MIND_CONTROL: "Mind Control",
    SUMMON: "Summon",
    DECK_CARD: "Deck Card",
    HAND_CARD: "Hand Card",
    MANA: "Mana",
    DEFEAT: "Defeat",
};
export const GALAGUERRE_ACTIONS_TYPES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_ACTIONS_TYPES_LABEL_OBJ,
);

export const GALAGUERRE_DECK_CARD_OPERATIONS = ["ADD", "DELETE"] as const;
export type GalaguerreDeckCardOperation = GenerateTypeFromEnum<
    typeof GALAGUERRE_DECK_CARD_OPERATIONS
>;
export const GALAGUERRE_DECK_CARD_OPERATIONS_OBJ = generateTypeObjectFromEnum(
    GALAGUERRE_DECK_CARD_OPERATIONS,
);
export const GALAGUERRE_DECK_CARD_OPERATIONS_LABEL_OBJ: LabelObjectType<GalaguerreDeckCardOperation> =
    {
        ADD: "Add",
        DELETE: "Delete",
    };
export const GALAGUERRE_DECK_CARD_OPERATIONS_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_DECK_CARD_OPERATIONS_LABEL_OBJ,
);

export const GALAGUERRE_DECK_PLACEMENTS = ["TOP", "BOTTOM", "RANDOM"] as const;
export type GalaguerreDeckPlacement = GenerateTypeFromEnum<typeof GALAGUERRE_DECK_PLACEMENTS>;
export const GALAGUERRE_DECK_PLACEMENTS_OBJ = generateTypeObjectFromEnum(
    GALAGUERRE_DECK_PLACEMENTS,
);
export const GALAGUERRE_DECK_PLACEMENTS_LABEL_OBJ: LabelObjectType<GalaguerreDeckPlacement> = {
    TOP: "Top",
    BOTTOM: "Bottom",
    RANDOM: "Random",
};
export const GALAGUERRE_DECK_PLACEMENTS_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_DECK_PLACEMENTS_LABEL_OBJ,
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

export const GALAGUERRE_PASSIVES_TRIGGERS_ON = [
    "TURN_END",
    "TURN_BEGIN",
    "DRAW",
    "HEAL",
    "DAMAGE",
    "PLAY_CARD",
    "SUMMON",
] as const;
export type GalaguerrePassiveTriggersOn = GenerateTypeFromEnum<
    typeof GALAGUERRE_PASSIVES_TRIGGERS_ON
>;
export const GALAGUERRE_PASSIVES_TRIGGERS_ON_OBJ = generateTypeObjectFromEnum(
    GALAGUERRE_PASSIVES_TRIGGERS_ON,
);
export const GALAGUERRE_PASSIVES_TRIGGERS_ON_LABEL_OBJ: LabelObjectType<GalaguerrePassiveTriggersOn> =
    {
        DAMAGE: "Damage",
        DRAW: "Draw",
        HEAL: "Heal",
        PLAY_CARD: "Play Card",
        SUMMON: "Summon",
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

export const GALAGUERRE_DYNAMIC_COST_SOURCES = [
    "HAND_CARD_COUNT",
    "BOARD_MINION_COUNT",
    "HERO_MISSING_HEALTH",
] as const;
export type GalaguerreDynamicCostSource = GenerateTypeFromEnum<
    typeof GALAGUERRE_DYNAMIC_COST_SOURCES
>;
export const GALAGUERRE_DYNAMIC_COST_SOURCES_OBJ = generateTypeObjectFromEnum(
    GALAGUERRE_DYNAMIC_COST_SOURCES,
);
export const GALAGUERRE_DYNAMIC_COST_SOURCES_LABEL_OBJ: LabelObjectType<GalaguerreDynamicCostSource> =
    {
        HAND_CARD_COUNT: "Hand Card Count",
        BOARD_MINION_COUNT: "Board Minion Count",
        HERO_MISSING_HEALTH: "Hero Missing Health",
    };
export const GALAGUERRE_DYNAMIC_COST_SOURCES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_DYNAMIC_COST_SOURCES_LABEL_OBJ,
);

export const GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES = ["OPPONENT_MINION_COUNT"] as const;
export type GalaguerreManaAmountScaleSource = GenerateTypeFromEnum<
    typeof GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES
>;
export const GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES_OBJ = generateTypeObjectFromEnum(
    GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES,
);
export const GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES_LABEL_OBJ: LabelObjectType<GalaguerreManaAmountScaleSource> =
    {
        OPPONENT_MINION_COUNT: "Opponent Minion Count",
    };
export const GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES_OPTIONS = generateOptionsFromLabelObj(
    GALAGUERRE_MANA_AMOUNT_SCALE_SOURCES_LABEL_OBJ,
);
