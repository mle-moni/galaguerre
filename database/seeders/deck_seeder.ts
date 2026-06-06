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
        const battlecryDamageCard = await Card.query()
            .where("label", "Monster 2-1 Battlecry Damage")
            .firstOrFail();
        const battlecryHealCard = await Card.query()
            .where("label", "Monster 2-1 Battlecry Heal")
            .firstOrFail();
        const battlecryDrawCard = await Card.query()
            .where("label", "Monster 2-1 Battlecry Draw")
            .firstOrFail();
        const battlecryEnemyDrawCard = await Card.query()
            .where("label", "Monster 2-1 Battlecry Enemy Draw")
            .firstOrFail();

        const guaranteedLabels = [
            "Monster 1-2",
            "Monster 2-1 Charge",
            "Monster 2-1 Battlecry Damage",
            "Monster 2-1 Battlecry Heal",
            "Monster 2-1 Battlecry Draw",
            "Monster 2-1 Battlecry Enemy Draw",
        ];
        const otherCards = await Card.query().whereNotIn("label", guaranteedLabels);

        const TAUNT_COPIES_PER_DECK = 2;
        const CHARGE_COPIES_PER_DECK = 2;
        const BATTLECRY_COPIES_PER_DECK = 1;
        const DECK_SIZE = 10;

        for (const deck of decks) {
            const shuffledOthers = shuffleArray(otherCards);
            const fillerCount =
                DECK_SIZE -
                TAUNT_COPIES_PER_DECK -
                CHARGE_COPIES_PER_DECK -
                BATTLECRY_COPIES_PER_DECK * 4;

            const deckCardIds = [
                ...Array.from({ length: TAUNT_COPIES_PER_DECK }, () => tauntCard.id),
                ...Array.from({ length: CHARGE_COPIES_PER_DECK }, () => chargeCard.id),
                battlecryDamageCard.id,
                battlecryHealCard.id,
                battlecryDrawCard.id,
                battlecryEnemyDrawCard.id,
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
