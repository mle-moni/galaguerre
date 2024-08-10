import { createModelViewConfig } from "#adomin/create_model_view_config";
import MinionBattlecryAction from "#models/minion_battlecry_action";

export const MINION_BATTLECRY_ACTION_VIEW = createModelViewConfig(() => MinionBattlecryAction, {
    columns: {
        action: {
            type: "belongsToRelation",
            modelName: "Action",
            labelFields: ["internalLabel"],
            label: "Action",
        },
        minion: {
            type: "belongsToRelation",
            modelName: "Minion",
            labelFields: ["internalLabel"],
            label: "Monstre",
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
    label: "Cri de guerre",
    icon: "speakerphone",
});
