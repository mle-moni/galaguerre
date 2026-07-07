export type { CardTag } from "../app/galaguerre/card_tags.js";
export type {
    ActionConditionDefinition as ActionConditionSnapshot,
    CardActionDefinition as CardActionSnapshot,
    CardActionFieldsDefinition as CardActionFieldsSnapshot,
    BoostDefinition as BoostSnapshot,
    MinionPower as MinionPowerSnapshot,
    CardFilterDefinition as CardFilterSnapshot,
    ReconvertParametersDefinition as ReconvertParametersSnapshot,
    ComparisonDefinition as ComparisonSnapshot,
    OnTargetResultDefinition,
    PassiveDefinition as PassiveSnapshot,
    PassiveBoostDefinition as PassiveBoostSnapshot,
    TargetDefinition as TargetSnapshot,
    DynamicCostDefinition as DynamicCostSnapshot,
    MinionCardData,
    SpellCardData,
    WeaponCardData,
    CardData,
} from "../app/galaguerre/card_definition.schema.js";

export {
    CARD_LABEL_TAGS,
    CARD_LABEL_TAG_LABELS,
} from "../app/galaguerre/card_label_tags.js";
export type { CardLabelTag } from "../app/galaguerre/card_label_tags.js";
export { CARD_TAGS, CARD_TAG_LABELS, isCardTagImageSymbol } from "../app/galaguerre/card_tags.js";
