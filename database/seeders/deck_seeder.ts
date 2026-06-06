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
        const targetedHeroDamageCard = await Card.query()
            .where("label", "Monster 2-2 Targeted Hero Damage")
            .firstOrFail();
        const targetedMinionDamageCard = await Card.query()
            .where("label", "Monster 2-2 Targeted Minion Damage")
            .firstOrFail();
        const heroSpellPowerBoostCard = await Card.query()
            .where("label", "Monster 2-2 Hero Spell Power Boost")
            .firstOrFail();
        const deathrattleDamageCard = await Card.query()
            .where("label", "Monster 2-1 Deathrattle Damage")
            .firstOrFail();
        const spellHeroDamageCard = await Card.query()
            .where("label", "Spell 2 Hero Damage")
            .firstOrFail();
        const spellTargetedDamageCard = await Card.query()
            .where("label", "Spell 3 Targeted Damage")
            .firstOrFail();
        const spellDrawCard = await Card.query().where("label", "Spell 1 Draw").firstOrFail();
        const spellMassDamageCard = await Card.query()
            .where("label", "Spell 2 Mass Minion Damage")
            .firstOrFail();
        const weaponSimpleCard = await Card.query().where("label", "Weapon 2 - 3/2").firstOrFail();
        const weaponDeathrattleCard = await Card.query()
            .where("label", "Weapon 3 - 2/3 Deathrattle Draw")
            .firstOrFail();

        const guaranteedLabels = [
            "Monster 1-2",
            "Monster 2-1 Charge",
            "Monster 2-1 Battlecry Damage",
            "Monster 2-1 Battlecry Heal",
            "Monster 2-1 Battlecry Draw",
            "Monster 2-2 Targeted Hero Damage",
            "Monster 2-2 Targeted Minion Damage",
            "Monster 2-2 Hero Spell Power Boost",
            "Monster 2-1 Deathrattle Damage",
            "Spell 2 Hero Damage",
            "Spell 3 Targeted Damage",
            "Spell 1 Draw",
            "Spell 2 Mass Minion Damage",
            "Weapon 2 - 3/2",
            "Weapon 3 - 2/3 Deathrattle Draw",
        ];
        const otherCards = await Card.query().whereNotIn("label", guaranteedLabels);

        const DECK_SIZE = 20;
        const SPELL_COPIES_PER_DECK = 2;

        for (const deck of decks) {
            const shuffledOthers = shuffleArray(otherCards);
            const fillerCount = DECK_SIZE - 11 - SPELL_COPIES_PER_DECK * 4;

            const deckCardIds = [
                tauntCard.id,
                chargeCard.id,
                battlecryDamageCard.id,
                battlecryHealCard.id,
                battlecryDrawCard.id,
                targetedHeroDamageCard.id,
                targetedMinionDamageCard.id,
                heroSpellPowerBoostCard.id,
                deathrattleDamageCard.id,
                weaponSimpleCard.id,
                weaponDeathrattleCard.id,
                ...Array.from({ length: SPELL_COPIES_PER_DECK }, () => spellHeroDamageCard.id),
                ...Array.from({ length: SPELL_COPIES_PER_DECK }, () => spellTargetedDamageCard.id),
                ...Array.from({ length: SPELL_COPIES_PER_DECK }, () => spellDrawCard.id),
                ...Array.from({ length: SPELL_COPIES_PER_DECK }, () => spellMassDamageCard.id),
                ...shuffledOthers.slice(0, Math.max(0, fillerCount)).map((card) => card.id),
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
