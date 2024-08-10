import { createModelViewConfig } from "#adomin/create_model_view_config";
import MinionDeathrattleAction from "#models/minion_deathrattle_action";

export const MINION_DEATHRATTLE_ACTION_VIEW = createModelViewConfig(() => MinionDeathrattleAction, {
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
    label: "Dernier souffle",
    icon: "wind",
});
