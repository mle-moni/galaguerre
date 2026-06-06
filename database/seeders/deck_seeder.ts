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
        const targetedHeroDamageCard = await Card.query()
            .where("label", "Monster 2-2 Targeted Hero Damage")
            .firstOrFail();
        const targetedMinionDamageCard = await Card.query()
            .where("label", "Monster 2-2 Targeted Minion Damage")
            .firstOrFail();
        const targetedMinionHealCard = await Card.query()
            .where("label", "Monster 1-3 Targeted Minion Heal")
            .firstOrFail();
        const targetedStrongMinionCard = await Card.query()
            .where("label", "Monster 3-2 Targeted Strong Minion")
            .firstOrFail();
        const targetedBeastDamageCard = await Card.query()
            .where("label", "Monster 2-2 Targeted Beast Damage")
            .firstOrFail();
        const targetedLowHealthCard = await Card.query()
            .where("label", "Monster 2-3 Targeted Low Health")
            .firstOrFail();
        const targetedExpensiveCard = await Card.query()
            .where("label", "Monster 3-1 Targeted Expensive")
            .firstOrFail();
        const targetedAllyBoostCard = await Card.query()
            .where("label", "Monster 3-2 Targeted Ally Boost")
            .firstOrFail();
        const massAllyBoostCard = await Card.query()
            .where("label", "Monster 2-3 Mass Ally Boost")
            .firstOrFail();
        const heroSpellPowerBoostCard = await Card.query()
            .where("label", "Monster 2-2 Hero Spell Power Boost")
            .firstOrFail();
        const grantTauntBoostCard = await Card.query()
            .where("label", "Monster 2-2 Grant Taunt Boost")
            .firstOrFail();
        const targetedEnemyBoostCard = await Card.query()
            .where("label", "Monster 2-1 Targeted Enemy Boost")
            .firstOrFail();
        const deathrattleDamageCard = await Card.query()
            .where("label", "Monster 2-1 Deathrattle Damage")
            .firstOrFail();
        const deathrattleHealCard = await Card.query()
            .where("label", "Monster 2-1 Deathrattle Heal")
            .firstOrFail();
        const deathrattleDrawCard = await Card.query()
            .where("label", "Monster 2-1 Deathrattle Draw")
            .firstOrFail();
        const deathrattleEnemyDrawCard = await Card.query()
            .where("label", "Monster 2-1 Deathrattle Enemy Draw")
            .firstOrFail();
        const deathrattleMassDamageCard = await Card.query()
            .where("label", "Monster 2-1 Deathrattle Mass Damage")
            .firstOrFail();

        const guaranteedLabels = [
            "Monster 1-2",
            "Monster 2-1 Charge",
            "Monster 2-1 Battlecry Damage",
            "Monster 2-1 Battlecry Heal",
            "Monster 2-1 Battlecry Draw",
            "Monster 2-1 Battlecry Enemy Draw",
            "Monster 2-2 Targeted Hero Damage",
            "Monster 2-2 Targeted Minion Damage",
            "Monster 1-3 Targeted Minion Heal",
            "Monster 3-2 Targeted Strong Minion",
            "Monster 2-2 Targeted Beast Damage",
            "Monster 2-3 Targeted Low Health",
            "Monster 3-1 Targeted Expensive",
            "Monster 3-2 Targeted Ally Boost",
            "Monster 2-3 Mass Ally Boost",
            "Monster 2-2 Hero Spell Power Boost",
            "Monster 2-2 Grant Taunt Boost",
            "Monster 2-1 Targeted Enemy Boost",
            "Monster 2-1 Deathrattle Damage",
            "Monster 2-1 Deathrattle Heal",
            "Monster 2-1 Deathrattle Draw",
            "Monster 2-1 Deathrattle Enemy Draw",
            "Monster 2-1 Deathrattle Mass Damage",
        ];
        const otherCards = await Card.query().whereNotIn("label", guaranteedLabels);

        const TAUNT_COPIES_PER_DECK = 2;
        const CHARGE_COPIES_PER_DECK = 2;
        const BATTLECRY_COPIES_PER_DECK = 1;
        const TARGETED_BATTLECRY_COPIES_PER_DECK = 1;
        const BOOST_COPIES_PER_DECK = 1;
        const DEATHRATTLE_COPIES_PER_DECK = 1;
        const DECK_SIZE = 25;

        for (const deck of decks) {
            const shuffledOthers = shuffleArray(otherCards);
            const fillerCount =
                DECK_SIZE -
                TAUNT_COPIES_PER_DECK -
                CHARGE_COPIES_PER_DECK -
                BATTLECRY_COPIES_PER_DECK * 4 -
                TARGETED_BATTLECRY_COPIES_PER_DECK * 7 -
                BOOST_COPIES_PER_DECK * 5 -
                DEATHRATTLE_COPIES_PER_DECK * 5;

            const deckCardIds = [
                ...Array.from({ length: TAUNT_COPIES_PER_DECK }, () => tauntCard.id),
                ...Array.from({ length: CHARGE_COPIES_PER_DECK }, () => chargeCard.id),
                battlecryDamageCard.id,
                battlecryHealCard.id,
                battlecryDrawCard.id,
                battlecryEnemyDrawCard.id,
                targetedHeroDamageCard.id,
                targetedMinionDamageCard.id,
                targetedMinionHealCard.id,
                targetedStrongMinionCard.id,
                targetedBeastDamageCard.id,
                targetedLowHealthCard.id,
                targetedExpensiveCard.id,
                targetedAllyBoostCard.id,
                massAllyBoostCard.id,
                heroSpellPowerBoostCard.id,
                grantTauntBoostCard.id,
                targetedEnemyBoostCard.id,
                deathrattleDamageCard.id,
                deathrattleHealCard.id,
                deathrattleDrawCard.id,
                deathrattleEnemyDrawCard.id,
                deathrattleMassDamageCard.id,
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
