import { createModelViewConfig } from "#adomin/create_model_view_config";
import CardFilterTag from "#models/card_filter_tag";

export const CARD_FILTER_TAG_VIEW = createModelViewConfig(() => CardFilterTag, {
    columns: {
        cardFilter: {
            type: "belongsToRelation",
            modelName: "CardFilter",
            labelFields: ["internalLabel"],
            label: "Filtre de carte",
        },
        tag: {
            type: "belongsToRelation",
            modelName: "Tag",
            labelFields: ["label"],
            label: "Tag",
        },
        createdAt: {
            type: "date",
            subType: "datetime",
            label: "Créé le",
            creatable: false,
            editable: false,
        },
        updatedAt: {
            type: "date",
            subType: "datetime",
            label: "Modifié le",
            creatable: false,
            editable: false,
        },
    },
    label: "Tag de filtre de carte",
    icon: "tag",
});
