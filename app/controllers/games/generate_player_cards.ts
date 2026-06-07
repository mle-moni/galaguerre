import type { PlayerCard, PlayerCardBase } from "#api_types/game.types";
import { formatActionDescription } from "../../galaguerre/action_engine/format_action_description.js";
import { serializeAction } from "../../galaguerre/action_engine/serialize_action.js";
import { serializePassive } from "../../galaguerre/action_engine/serialize_passive.js";
import {
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getMinionPowerEffects,
    getPassiveDescription,
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
        const passives = (card.minion.passives ?? []).map((mp) => serializePassive(mp.passive));
        const battlecryLines = getBattlecryDescription(battlecryActions);
        const deathrattleLines = getDeathrattleDescription(deathrattleActions);
        const passiveLines = getPassiveDescription(passives);

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
                passiveLines,
            ),
            battlecryActions,
            deathrattleActions,
            passives,
        };
    });

    return shuffleArray(cards);
};
