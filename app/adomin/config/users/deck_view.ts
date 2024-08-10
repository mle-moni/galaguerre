import { createModelViewConfig } from "#adomin/create_model_view_config";
import Deck from "#models/deck";

export const DECK_VIEW = createModelViewConfig(() => Deck, {
    columns: {
        name: {
            type: "string",
            label: "Nom",
        },
        user: {
            type: "belongsToRelation",
            modelName: "User",
            labelFields: ["pseudo"],
            label: "Utilisateur",
        },
        cards: {
            type: "hasManyRelation",
            modelName: "DeckCard",
            labelFields: ["cardLabel"],
            label: "Cartes",
            creatable: false,
            editable: false,
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
    label: "Deck",
    icon: "books",
    queryBuilderCallback: (q) => q.preload("cards", (q2) => q2.preload("card")),
});
