import { createModelViewConfig } from "#adomin/create_model_view_config";
import MinionPassive from "#models/minon_passive";

export const MINION_PASSIVE_VIEW = createModelViewConfig(() => MinionPassive, {
    columns: {
        minion: {
            type: "belongsToRelation",
            modelName: "Minion",
            labelFields: ["internalLabel"],
            label: "Monstre",
        },
        passive: {
            type: "belongsToRelation",
            modelName: "Passive",
            labelFields: ["internalLabel"],
            label: "Passif",
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
            label: "Mis à jour le",
            creatable: false,
            editable: false,
        },
    },
    label: "Passif de monstre",
    icon: "bed",
});
