import { createModelViewConfig } from "#adomin/create_model_view_config";
import Target from "#models/target";
import { GALAGUERRE_TARGET_TYPES_OPTIONS } from "../../../galaguerre/galaguerre.types.js";

export const TARGET_VIEW = createModelViewConfig(() => Target, {
    columns: {
        type: {
            type: "enum",
            options: GALAGUERRE_TARGET_TYPES_OPTIONS,
            label: "Type",
        },
        comparison: {
            type: "belongsToRelation",
            labelFields: ["internalLabel"],
            modelName: "Comparison",
            label: "Comparaison",
            nullable: true,
        },
        internalLabel: {
            type: "string",
            label: "Nom interne",
        },
        tag: {
            type: "belongsToRelation",
            labelFields: ["label"],
            modelName: "Tag",
            label: "Tag",
            nullable: true,
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
    label: "Cible",
    icon: "viewfinder",
});
