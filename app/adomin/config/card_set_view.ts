import { createModelViewConfig } from "#adomin/create_model_view_config";
import CardSet from "#models/card_set";

export const CARD_SET_VIEW = createModelViewConfig(() => CardSet, {
    columns: {
        name: {
            type: "string",
            label: "Nom",
        },
        isActive: {
            type: "boolean",
            label: "Actif",
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
    label: "Set de cartes",
    icon: "stack-2",
});
