import type { PlayerCard, PlayerCardBase } from "#api_types/game.types";
import {
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getMinionPowerEffects,
    getPassiveDescription,
    getSpellCardDescription,
    getSpellEffectDescription,
    getWeaponCardDescription,
} from "../../galaguerre/minion_card_metadata.js";
import type Deck from "#models/deck";
import type Card from "#models/card";
import { randomUUID } from "node:crypto";
import { shuffleArray } from "../../utils/array.js";

type CardSource = Deck | Card[];

const getSourceCards = (source: CardSource): Card[] =>
    Array.isArray(source) ? source : source.cards;

export const generatePlayerCards = (source: CardSource) => {
    const cards: PlayerCard[] = getSourceCards(source).map((card) => {
        const base: PlayerCardBase = {
            uuid: randomUUID(),
            cardId: card.id,
            label: card.data.name,
            imageUrl: card.data.imageUrl,
            cost: card.data.cost,
            tags: card.data.tags,
        };

        switch (card.data.type) {
            case "WEAPON": {
                const deathrattleLines = getDeathrattleDescription(card.data.deathrattleActions);

                return {
                    ...base,
                    type: "WEAPON",
                    damage: card.data.damage,
                    durability: card.data.durability,
                    deathrattleActions: card.data.deathrattleActions,
                    description: getWeaponCardDescription(
                        card.data.damage,
                        card.data.durability,
                        deathrattleLines,
                    ),
                };
            }
            case "SPELL": {
                const effectLines = getSpellEffectDescription(card.data.spellActions);

                return {
                    ...base,
                    type: "SPELL",
                    description: getSpellCardDescription(effectLines) || card.data.name,
                    spellActions: card.data.spellActions,
                };
            }
            case "MINION": {
                const effects = getMinionPowerEffects(card.data);
                const battlecryLines = getBattlecryDescription(card.data.battlecryActions);
                const deathrattleLines = getDeathrattleDescription(card.data.deathrattleActions);
                const passiveLines = getPassiveDescription(card.data.passives);

                return {
                    ...base,
                    type: "MINION",
                    health: card.data.health,
                    attack: card.data.attack,
                    hasTaunt: card.data.hasTaunt,
                    hasCharge: card.data.hasCharge,
                    hasWindfury: card.data.hasWindfury,
                    isPoisonous: card.data.isPoisonous,
                    effects,
                    description: getMinionCardDescription(
                        card.data.attack,
                        card.data.health,
                        effects,
                        battlecryLines,
                        deathrattleLines,
                        passiveLines,
                    ),
                    battlecryActions: card.data.battlecryActions,
                    deathrattleActions: card.data.deathrattleActions,
                    passives: card.data.passives,
                };
            }
        }
    });

    return shuffleArray(cards);
};
