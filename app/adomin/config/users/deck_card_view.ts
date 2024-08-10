import { createModelViewConfig } from "#adomin/create_model_view_config";
import DeckCard from "#models/deck_card";

export const DECK_CARD_VIEW = createModelViewConfig(() => DeckCard, {
    columns: {
        card: {
            type: "belongsToRelation",
            modelName: "Card",
            labelFields: ["label"],
            label: "Carte",
        },
        deck: {
            type: "belongsToRelation",
            modelName: "Deck",
            labelFields: ["name"],
            label: "Deck",
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
    label: "Carte de deck",
    icon: "play-card",
});
