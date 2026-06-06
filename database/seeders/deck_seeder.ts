import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import User from "#models/user";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { shuffleArray } from "../../app/utils/array.js";

const PASSIVE_CARD_LABELS = [
    "Monster 2-3 Passive Turn End Damage",
    "Monster 3-2 Passive Turn End Mass Damage",
    "Monster 2-4 Passive Turn Begin Heal",
    "Monster 2-3 Passive Draw",
    "Monster 2-2 Passive Heal Reactive",
    "Monster 1-4 Passive Aura +1/+1",
    "Monster 2-3 Passive Aura Spell Power",
] as const;

const CORE_CARD_LABELS = [
    "Monster 1-2",
    "Monster 2-1 Charge",
    "Monster 2-1 Battlecry Heal",
    "Monster 2-1 Battlecry Damage",
    "Spell 2 Hero Damage",
    "Spell 1 Draw",
    "Weapon 2 - 3/2",
] as const;

const GUARANTEED_LABELS = [...CORE_CARD_LABELS, ...PASSIVE_CARD_LABELS];

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

        const cardByLabel = async (label: string) => Card.query().where("label", label).firstOrFail();

        const tauntCard = await cardByLabel("Monster 1-2");
        const chargeCard = await cardByLabel("Monster 2-1 Charge");
        const battlecryHealCard = await cardByLabel("Monster 2-1 Battlecry Heal");
        const battlecryDamageCard = await cardByLabel("Monster 2-1 Battlecry Damage");
        const spellHeroDamageCard = await cardByLabel("Spell 2 Hero Damage");
        const spellDrawCard = await cardByLabel("Spell 1 Draw");
        const weaponSimpleCard = await cardByLabel("Weapon 2 - 3/2");

        const passiveCards = await Promise.all(PASSIVE_CARD_LABELS.map((label) => cardByLabel(label)));
        const [
            passiveTurnEndDamageCard,
            passiveTurnEndMassCard,
            passiveTurnBeginHealCard,
            passiveDrawCard,
            passiveHealReactiveCard,
            passiveAuraPlusOneCard,
            passiveAuraSpellPowerCard,
        ] = passiveCards;

        const otherCards = await Card.query().whereNotIn("label", [...GUARANTEED_LABELS]);

        const DECK_SIZE = 20;
        const PASSIVE_AURA_COPIES = 2;

        for (const deck of decks) {
            const shuffledOthers = shuffleArray(otherCards);
            const guaranteedCount =
                CORE_CARD_LABELS.length +
                PASSIVE_CARD_LABELS.length +
                PASSIVE_AURA_COPIES -
                1;
            const fillerCount = DECK_SIZE - guaranteedCount;

            const deckCardIds = [
                tauntCard.id,
                chargeCard.id,
                battlecryHealCard.id,
                battlecryDamageCard.id,
                spellHeroDamageCard.id,
                spellDrawCard.id,
                weaponSimpleCard.id,
                passiveTurnEndDamageCard.id,
                passiveTurnEndMassCard.id,
                passiveTurnBeginHealCard.id,
                passiveDrawCard.id,
                passiveHealReactiveCard.id,
                passiveAuraPlusOneCard.id,
                passiveAuraSpellPowerCard.id,
                ...Array.from({ length: PASSIVE_AURA_COPIES }, () => passiveAuraPlusOneCard.id),
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
