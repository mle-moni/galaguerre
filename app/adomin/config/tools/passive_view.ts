import { createModelViewConfig } from "#adomin/create_model_view_config";
import Passive from "#models/passive";
import {
    GALAGUERRE_PASSIVES_TRIGGERS_ON_OPTIONS,
    GALAGUERRE_PASSIVES_TYPES_OPTIONS,
} from "../../../galaguerre/galaguerre.types.js";

export const PASSIVE_VIEW = createModelViewConfig(() => Passive, {
    columns: {
        type: {
            type: "enum",
            options: GALAGUERRE_PASSIVES_TYPES_OPTIONS,
            label: "Type",
        },
        triggersOn: {
            type: "enum",
            options: GALAGUERRE_PASSIVES_TRIGGERS_ON_OPTIONS,
            label: "Déclenché par",
            nullable: true,
        },
        action: {
            type: "belongsToRelation",
            modelName: "Action",
            labelFields: ["internalLabel"],
            label: "Action",
            nullable: true,
        },
        boost: {
            type: "belongsToRelation",
            modelName: "Boost",
            labelFields: ["internalLabel"],
            label: "Boost",
            nullable: true,
        },
        internalLabel: {
            type: "string",
            label: "Libellé interne",
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
    label: "Passif",
    icon: "bed",
});
