import type { ApiCatalogCard } from "#api_types/deck.types";
import type Card from "#models/card";
import { formatActionDescription } from "../action_engine/format_action_description.js";
import {
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getMinionPowerEffects,
    getPassiveDescription,
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
        case "SPELL":
            return {
                ...base,
                type: "SPELL",
                description: formatActionDescription(card.data.action, "Effet") ?? card.data.name,
                action: card.data.action,
            };
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
};
