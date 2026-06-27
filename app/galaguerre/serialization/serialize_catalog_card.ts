import type { ApiCatalogCard } from "#api_types/deck.types";
import type Card from "#models/card";
import {
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getMinionPowerEffects,
    getPassiveDescription,
    getSpellCardDescription,
    getSpellEffectDescription,
    getWeaponCardDescription,
} from "../minion_card_metadata.js";

export const serializeCatalogCard = (card: Card): ApiCatalogCard => {
    const base = {
        id: card.id,
        label: card.data.name,
        imageUrl: card.data.imageUrl,
        cost: card.data.cost,
        cardSetId: card.cardSetId,
        tags: card.data.tags,
        rarity: card.rarity,
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
            const castsWhenDrawn = card.data.castsWhenDrawn ?? false;

            return {
                ...base,
                type: "SPELL",
                description: getSpellCardDescription(effectLines, castsWhenDrawn) || card.data.name,
                spellActions: card.data.spellActions,
                castsWhenDrawn,
            };
        }
        case "MINION": {
            const effects = getMinionPowerEffects(card.data.minionPowers);
            const battlecryLines = getBattlecryDescription(card.data.battlecryActions);
            const deathrattleLines = getDeathrattleDescription(card.data.deathrattleActions);
            const passiveLines = getPassiveDescription(card.data.passives);

            return {
                ...base,
                type: "MINION",
                health: card.data.health,
                attack: card.data.attack,
                minionPowers: card.data.minionPowers,
                effects,
                description: getMinionCardDescription(
                    card.data.attack,
                    card.data.health,
                    effects,
                    battlecryLines,
                    deathrattleLines,
                    passiveLines,
                    card.data.dynamicCost,
                ),
                battlecryActions: card.data.battlecryActions,
                deathrattleActions: card.data.deathrattleActions,
                passives: card.data.passives,
            };
        }
    }
};
