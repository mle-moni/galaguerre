import { createModelViewConfig } from "#adomin/create_model_view_config";
import Card from "#models/card";
import { createFile, deleteFile } from "../../utils/files.js";

export const CARD_VIEW = createModelViewConfig(() => Card, {
    columns: {
        label: {
            type: "string",
            label: "Nom",
        },
        cost: {
            type: "number",
            label: "Coût",
        },
        imageUrl: {
            type: "file",
            subType: "url",
            isImage: true,
            createFile,
            deleteFile,
            label: "Image",
        },
        cardSet: {
            type: "belongsToRelation",
            modelName: "CardSet",
            labelFields: ["name"],
            label: "Set",
        },
        // data: {
        //     type: "json",
        //     label: "Données",
        // }
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
    label: "Carte",
    icon: "cards",
});
