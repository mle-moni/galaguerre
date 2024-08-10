import { createModelViewConfig } from "#adomin/create_model_view_config";
import Tag from "#models/tag";

export const TAG_VIEW = createModelViewConfig(() => Tag, {
    columns: {
        name: {
            type: "string",
            label: "Valeur",
        },
        label: {
            type: "string",
            label: "Libellé",
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
    label: "Tag",
    icon: "tag",
});
