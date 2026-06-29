import type { CardRarity } from "#api_types/card_rarity.types";
import { PACK_LEGENDARY_DROP_CHANCE } from "#api_types/card_rarity.types";
import { randomInt } from "node:crypto";
import { randomIntInRange } from "../../utils/random.js";

export type WeightedPackCard = {
    id: number;
    rarity: CardRarity;
};

const PACK_LEGENDARY_ROLL_SCALE = 10_000;

export type PackDrawRandom = {
    rollLegendarySlot: () => boolean;
    pickIndex: (max: number) => number;
};

export const createPackDrawRandom = (): PackDrawRandom => ({
    rollLegendarySlot: () =>
        randomInt(PACK_LEGENDARY_ROLL_SCALE) <
        PACK_LEGENDARY_DROP_CHANCE * PACK_LEGENDARY_ROLL_SCALE,
    pickIndex: (max) => randomIntInRange(0, max),
});

const pickUniform = <T>(items: T[], pickIndex: (max: number) => number): T => {
    return items[pickIndex(items.length - 1)];
};

export const drawPackCardsWithoutReplacement = (
    cards: WeightedPackCard[],
    count: number,
    random: PackDrawRandom = createPackDrawRandom(),
): number[] => {
    const pool = [...cards];
    const drawn: number[] = [];

    for (let slot = 0; slot < count; slot += 1) {
        const legendaries = pool.filter((card) => card.rarity === "LEGENDARY");
        const commons = pool.filter((card) => card.rarity === "COMMON");

        const isLegendarySlot = random.rollLegendarySlot();

        let candidates: WeightedPackCard[];
        if (isLegendarySlot && legendaries.length > 0) {
            candidates = legendaries;
        } else if (commons.length > 0) {
            candidates = commons;
        } else {
            candidates = legendaries;
        }

        const selected = pickUniform(candidates, random.pickIndex);
        drawn.push(selected.id);

        const selectedIndex = pool.findIndex((card) => card.id === selected.id);
        pool.splice(selectedIndex, 1);
    }

    return drawn;
};
