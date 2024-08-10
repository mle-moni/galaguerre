import { createModelViewConfig } from "#adomin/create_model_view_config";
import Weapon from "#models/weapon";

export const WEAPON_VIEW = createModelViewConfig(() => Weapon, {
    columns: {
        internalLabel: {
            type: "string",
            label: "Nom interne",
        },
        damage: {
            type: "number",
            label: "Dégâts",
        },
        durability: {
            type: "number",
            label: "Durabilité",
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
    label: "Arme",
    icon: "sword",
});
