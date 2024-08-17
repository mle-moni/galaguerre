import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import User from "#models/user";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { shuffleArray } from "../../app/utils/array.js";

export default class extends BaseSeeder {
    async run() {
        const users = await User.all();

        const decks = await Deck.createMany(
            users.map((user) => ({
                name: `Deck for ${user.email}`,
                userId: user.id,
                selected: true,
            })),
        );

        const cards = await Card.all();

        for (const deck of decks) {
            const shuffledCards = shuffleArray(cards);

            await DeckCard.createMany(
                shuffledCards.slice(0, 10).map((card) => ({
                    cardId: card.id,
                    deckId: deck.id,
                })),
            );
        }
    }
}
