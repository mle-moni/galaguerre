import type { ApiCatalogCard } from "#api_types/deck.types";
import { generateCardDescriptionFromData } from "#galaguerre/generate_card_description";
import type Card from "#models/card";
import { getMinionPowerEffects } from "../minion_card_metadata.js";

export const serializeCatalogCard = (card: Card): ApiCatalogCard => {
    const description = card.generatedDescription ?? generateCardDescriptionFromData(card.data);

    const base = {
        id: card.id,
        label: card.data.name,
        imageUrl: card.data.imageUrl,
        goldenVideoUrl: card.data.goldenVideoUrl ?? null,
        cost: card.data.cost,
        dynamicCost: card.data.dynamicCost,
        cardSetId: card.cardSetId,
        tags: card.data.tags,
        rarity: card.rarity,
        isCollectible: card.isCollectible,
        description,
    };

    switch (card.data.type) {
        case "WEAPON":
            return {
                ...base,
                type: "WEAPON",
                damage: card.data.damage,
                durability: card.data.durability,
                deathrattleActions: card.data.deathrattleActions,
                heroAttackActions: card.data.heroAttackActions ?? [],
            };
        case "SPELL":
            return {
                ...base,
                type: "SPELL",
                spellActions: card.data.spellActions,
                castsWhenDrawn: card.data.castsWhenDrawn ?? false,
            };
        case "MINION": {
            const effects = getMinionPowerEffects(card.data.minionPowers);

            return {
                ...base,
                type: "MINION",
                health: card.data.health,
                attack: card.data.attack,
                minionPowers: card.data.minionPowers,
                effects,
                battlecryActions: card.data.battlecryActions,
                comboActions: card.data.comboActions ?? [],
                deathrattleActions: card.data.deathrattleActions,
                attackActions: card.data.attackActions ?? [],
                passives: card.data.passives,
            };
        }
    }
};
