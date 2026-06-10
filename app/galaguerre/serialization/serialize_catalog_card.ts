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
        label: card.label,
        imageUrl: card.imageUrl,
        cost: card.cost,
        cardSetId: card.cardSetId,
        tags: card.data.tags,
    };

    if (card.type === "WEAPON") {
        const data = card.data as Extract<typeof card.data, { damage: number }>;
        const deathrattleLines = getDeathrattleDescription(data.deathrattleActions);

        return {
            ...base,
            type: "WEAPON",
            damage: data.damage,
            durability: data.durability,
            deathrattleActions: data.deathrattleActions,
            description: getWeaponCardDescription(data.damage, data.durability, deathrattleLines),
        };
    }

    if (card.type === "SPELL") {
        const data = card.data as Extract<typeof card.data, { action: unknown }>;

        return {
            ...base,
            type: "SPELL",
            description: formatActionDescription(data.action, "Effet") ?? card.label,
            action: data.action,
        };
    }

    const data = card.data as Extract<typeof card.data, { attack: number }>;
    const effects = getMinionPowerEffects(data);
    const battlecryLines = getBattlecryDescription(data.battlecryActions);
    const deathrattleLines = getDeathrattleDescription(data.deathrattleActions);
    const passiveLines = getPassiveDescription(data.passives);

    return {
        ...base,
        type: "MINION",
        health: data.health,
        attack: data.attack,
        hasTaunt: data.hasTaunt,
        hasCharge: data.hasCharge,
        hasWindfury: data.hasWindfury,
        isPoisonous: data.isPoisonous,
        effects,
        description: getMinionCardDescription(
            data.attack,
            data.health,
            effects,
            battlecryLines,
            deathrattleLines,
            passiveLines,
        ),
        battlecryActions: data.battlecryActions,
        deathrattleActions: data.deathrattleActions,
        passives: data.passives,
    };
};
