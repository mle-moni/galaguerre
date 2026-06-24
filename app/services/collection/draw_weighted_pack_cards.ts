import type { CardRarity } from "#api_types/card_rarity.types";
import { PACK_DRAW_WEIGHT_BY_RARITY } from "#api_types/card_rarity.types";

export type WeightedPackCard = {
    id: number;
    rarity: CardRarity;
};

const getPackDrawWeight = (rarity: CardRarity): number => PACK_DRAW_WEIGHT_BY_RARITY[rarity];

export const drawWeightedPackCardsWithoutReplacement = (
    cards: WeightedPackCard[],
    count: number,
    random: () => number = Math.random,
): number[] => {
    const pool = [...cards];
    const drawn: number[] = [];

    for (let slot = 0; slot < count; slot += 1) {
        const totalWeight = pool.reduce((sum, card) => sum + getPackDrawWeight(card.rarity), 0);
        let roll = random() * totalWeight;

        let selectedIndex = 0;
        for (let index = 0; index < pool.length; index += 1) {
            roll -= getPackDrawWeight(pool[index].rarity);
            if (roll <= 0) {
                selectedIndex = index;
                break;
            }
        }

        drawn.push(pool[selectedIndex].id);
        pool.splice(selectedIndex, 1);
    }

    return drawn;
};
