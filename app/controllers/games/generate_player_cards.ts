import type { PlayerCard, PlayerCardBase } from "#api_types/game.types";
import { formatActionDescription } from "../../galaguerre/action_engine/format_action_description.js";
import { serializeAction } from "../../galaguerre/action_engine/serialize_action.js";
import {
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getMinionPowerEffects,
    getWeaponCardDescription,
} from "../../galaguerre/minion_card_metadata.js";
import type Deck from "#models/deck";
import { randomUUID } from "node:crypto";
import { shuffleArray } from "../../utils/array.js";

export const generatePlayerCards = (deck: Deck) => {
    const cards: PlayerCard[] = deck.cards.map((card) => {
        const base: PlayerCardBase = {
            uuid: randomUUID(),
            cardId: card.id,
            label: card.label,
            imageUrl: card.imageUrl,
            cost: card.cost,
            tagIds: (card.tags ?? []).map((tag) => tag.id),
        };

        if (card.type === "WEAPON") {
            if (!card.weapon) throw new Error("card.weapon not found");

            const deathrattleActions = (card.weapon.deathrattleActions ?? []).map((dra) =>
                serializeAction(dra.action),
            );
            const deathrattleLines = getDeathrattleDescription(deathrattleActions);

            return {
                ...base,
                type: "WEAPON",
                damage: card.weapon.damage,
                durability: card.weapon.durability,
                deathrattleActions,
                description: getWeaponCardDescription(
                    card.weapon.damage,
                    card.weapon.durability,
                    deathrattleLines,
                ),
            };
        }

        if (card.type === "SPELL") {
            if (!card.spell) throw new Error("card.spell not found");

            const action = serializeAction(card.spell.action);

            return {
                ...base,
                type: "SPELL",
                description: formatActionDescription(action, "Effet") ?? card.label,
                action,
            };
        }

        if (!card.minion) throw new Error("card.minion not found");

        const effects = getMinionPowerEffects(card.minion.minionPower);
        const battlecryActions = (card.minion.battlecryActions ?? []).map((bca) =>
            serializeAction(bca.action),
        );
        const deathrattleActions = (card.minion.deathrattleActions ?? []).map((dra) =>
            serializeAction(dra.action),
        );
        const battlecryLines = getBattlecryDescription(battlecryActions);
        const deathrattleLines = getDeathrattleDescription(deathrattleActions);

        return {
            ...base,
            type: "MINION",
            health: card.minion.health,
            attack: card.minion.attack,
            hasTaunt: card.minion.minionPower?.hasTaunt ?? false,
            hasCharge: card.minion.minionPower?.hasCharge ?? false,
            hasWindfury: card.minion.minionPower?.hasWindfury ?? false,
            isPoisonous: card.minion.minionPower?.isPoisonous ?? false,
            effects,
            tags: (card.tags ?? []).map((tag) => ({
                label: tag.label,
                symbol: tag.symbol,
            })),
            description: getMinionCardDescription(
                card.minion.attack,
                card.minion.health,
                effects,
                battlecryLines,
                deathrattleLines,
            ),
            battlecryActions,
            deathrattleActions,
        };
    });

    return shuffleArray(cards);
};
