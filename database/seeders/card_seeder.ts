import Card from "#models/card";
import CardSet from "#models/card_set";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { CLASSIC_CARDS } from "../seed_data/cards/classic_cards.js";
import { GALADRIM_CARDS } from "../seed_data/cards/galadrim_cards.js";
import { buildCardInsert } from "../seed_data/cards/define_card.js";

export default class extends BaseSeeder {
    async run() {
        const allCards = [...CLASSIC_CARDS, ...GALADRIM_CARDS];
        const setNames = [...new Set(allCards.map((card) => card.cardSetName))];

        const cardSets = await CardSet.query().whereIn("name", setNames);
        const cardSetByName = new Map(cardSets.map((set) => [set.name, set]));

        for (const setName of setNames) {
            if (!cardSetByName.has(setName)) {
                throw new Error(`Card set not found: ${setName}`);
            }
        }

        await Card.createMany(
            allCards.map((entry) =>
                buildCardInsert(entry, cardSetByName.get(entry.cardSetName)!.id),
            ),
        );
    }
}
