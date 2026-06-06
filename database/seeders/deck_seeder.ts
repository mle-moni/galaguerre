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

        const tauntCard = await Card.query().where("label", "Monster 1-2").firstOrFail();
        const chargeCard = await Card.query().where("label", "Monster 2-1 Charge").firstOrFail();
        const otherCards = await Card.query().whereNotIn("label", [
            "Monster 1-2",
            "Monster 2-1 Charge",
        ]);
        const TAUNT_COPIES_PER_DECK = 2;
        const CHARGE_COPIES_PER_DECK = 2;
        const DECK_SIZE = 10;

        for (const deck of decks) {
            const shuffledOthers = shuffleArray(otherCards);
            const fillerCount = DECK_SIZE - TAUNT_COPIES_PER_DECK - CHARGE_COPIES_PER_DECK;

            const deckCardIds = [
                ...Array.from({ length: TAUNT_COPIES_PER_DECK }, () => tauntCard.id),
                ...Array.from({ length: CHARGE_COPIES_PER_DECK }, () => chargeCard.id),
                ...shuffledOthers.slice(0, fillerCount).map((card) => card.id),
            ];

            await DeckCard.createMany(
                deckCardIds.map((cardId) => ({
                    cardId,
                    deckId: deck.id,
                })),
            );
        }
    }
}
