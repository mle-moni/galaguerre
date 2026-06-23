import DeckCard from "#models/deck_card";
import User from "#models/user";
import { createDeckFromRecipe } from "#services/decks/create_deck_from_recipe";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { SEEDED_DECKS } from "../seed_data/balanced_decks.js";

export default class extends BaseSeeder {
    async run() {
        const users = await User.all();

        for (const user of users) {
            for (const { name, recipe, selected } of SEEDED_DECKS) {
                await createDeckFromRecipe({
                    userId: user.id,
                    name,
                    recipe,
                    selected,
                });
            }
        }

        const deckCount = await DeckCard.query().count("* as total");
        if (users.length > 0 && Number(deckCount[0].$extras.total) === 0) {
            throw new Error("Deck seeder did not create any deck cards");
        }
    }
}
