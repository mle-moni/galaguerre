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
        selected: {
            type: "boolean",
            label: "Sélectionné",
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
    virtualColumns: [
        {
            name: "cards",
            getter: async (model) => model.cards.map((deckCard) => deckCard.card.label),
            adomin: {
                type: "array",
                label: "Cartes",
                creatable: false,
                editable: false,
            },
            columnOrderIndex: 3,
        },
    ],
    label: "Deck",
    icon: "books",
    queryBuilderCallback: (q) => q.preload("cards", (q2) => q2.preload("card")),
});
