import { createModelViewConfig } from "#adomin/create_model_view_config";
import Card from "#models/card";

export const CARD_VIEW = createModelViewConfig(() => Card, {
    columns: {
        cardSet: {
            type: "belongsToRelation",
            modelName: "CardSet",
            labelFields: ["name"],
            label: "Set",
        },
        data: {
            type: "object",
            label: "Données",
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
    } as Record<string, { type: string; label: string }>,
    label: "Carte",
    icon: "cards",
});
