import { createModelViewConfig } from "#adomin/create_model_view_config";
import ToolToTarget from "#models/tool_to_target";

export const TOOL_TO_TARGET_VIEW = createModelViewConfig(() => ToolToTarget, {
    columns: {
        target: {
            type: "belongsToRelation",
            modelName: "Target",
            labelFields: ["internalLabel"],
            label: "Cible",
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
    },
    label: "Lien Cible",
    icon: "link",
});
