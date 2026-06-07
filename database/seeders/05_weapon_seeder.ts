import Card from "#models/card";
import Weapon from "#models/weapon";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { getClassicCardImage } from "../seed_data/classic_card_images.js";

export default class extends BaseSeeder {
    async run() {
        const [warglaive, doublesWarglaives] = await Weapon.createMany([
            {
                internalLabel: "Warglaive d'Azzinoth",
                damage: 2,
                durability: 2,
            },
            {
                internalLabel: "Doubles warglaives",
                damage: 4,
                durability: 2,
            },
        ]);

        await Card.createMany([
            {
                label: "Warglaive d'Azzinoth",
                imageUrl: getClassicCardImage("Warglaive d'Azzinoth"),
                cost: 2,
                type: "WEAPON",
                cardMode: "BETA",
                minionId: null,
                spellId: null,
                weaponId: warglaive.id,
            },
            {
                label: "Doubles warglaives",
                imageUrl: getClassicCardImage("Doubles warglaives"),
                cost: 6,
                type: "WEAPON",
                cardMode: "BETA",
                minionId: null,
                spellId: null,
                weaponId: doublesWarglaives.id,
            },
        ]);
    }
}
