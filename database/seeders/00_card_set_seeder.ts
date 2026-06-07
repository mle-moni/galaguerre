import CardSet from "#models/card_set";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { HEARTHSTONE_CARD_SET_NAME } from "../seed_data/card_set_names.js";

export default class extends BaseSeeder {
    async run() {
        await CardSet.updateOrCreate(
            { name: HEARTHSTONE_CARD_SET_NAME },
            { name: HEARTHSTONE_CARD_SET_NAME, isActive: true },
        );
    }
}
