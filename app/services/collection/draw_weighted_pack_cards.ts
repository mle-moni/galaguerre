import type { CardRarity } from "#api_types/card_rarity.types";
import { PACK_RARITY_FALLBACK_ORDER, rollPackRarity } from "#api_types/card_rarity.types";
import { randomInt } from "node:crypto";
import { randomIntInRange } from "../../utils/random.js";

export type WeightedPackCard = {
    id: number;
    rarity: CardRarity;
};

const PACK_RARITY_ROLL_SCALE = 10_000;

export type PackDrawRandom = {
    rollRarity: () => CardRarity;
    pickIndex: (max: number) => number;
};

export const createPackDrawRandom = (): PackDrawRandom => ({
    rollRarity: () => rollPackRarity(() => randomInt(PACK_RARITY_ROLL_SCALE)),
    pickIndex: (max) => randomIntInRange(0, max),
});

const pickUniform = <T>(items: T[], pickIndex: (max: number) => number): T => {
    return items[pickIndex(items.length - 1)];
};

const getCandidatesForRarity = (
    pool: WeightedPackCard[],
    rolledRarity: CardRarity,
): WeightedPackCard[] => {
    const rolledIndex = PACK_RARITY_FALLBACK_ORDER.indexOf(rolledRarity);

    for (let index = rolledIndex; index < PACK_RARITY_FALLBACK_ORDER.length; index += 1) {
        const rarity = PACK_RARITY_FALLBACK_ORDER[index];
        const candidates = pool.filter((card) => card.rarity === rarity);
        if (candidates.length > 0) {
            return candidates;
        }
    }

    for (let index = rolledIndex - 1; index >= 0; index -= 1) {
        const rarity = PACK_RARITY_FALLBACK_ORDER[index];
        const candidates = pool.filter((card) => card.rarity === rarity);
        if (candidates.length > 0) {
            return candidates;
        }
    }

    return pool;
};

const isRarePlus = (rarity: CardRarity): boolean => rarity !== "COMMON";

const ensureMinimumRarePlusCard = (
    drawn: number[],
    cardsById: Map<number, WeightedPackCard>,
    pool: WeightedPackCard[],
    random: PackDrawRandom,
): void => {
    const hasRarePlus = drawn.some((id) => isRarePlus(cardsById.get(id)!.rarity));
    if (hasRarePlus) {
        return;
    }

    const commonSlots = drawn
        .map((id, index) => ({ id, index }))
        .filter(({ id }) => cardsById.get(id)!.rarity === "COMMON");
    if (commonSlots.length === 0) {
        return;
    }

    const candidates = getCandidatesForRarity(pool, "RARE").filter((card) =>
        isRarePlus(card.rarity),
    );
    if (candidates.length === 0) {
        return;
    }

    const slotToReplace = pickUniform(commonSlots, random.pickIndex);
    const replacement = pickUniform(candidates, random.pickIndex);
    drawn[slotToReplace.index] = replacement.id;

    const selectedIndex = pool.findIndex((card) => card.id === replacement.id);
    pool.splice(selectedIndex, 1);
};

export const drawPackCardsWithoutReplacement = (
    cards: WeightedPackCard[],
    count: number,
    random: PackDrawRandom = createPackDrawRandom(),
): number[] => {
    const pool = [...cards];
    const drawn: number[] = [];
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    for (let slot = 0; slot < count; slot += 1) {
        const rolledRarity = random.rollRarity();
        const candidates = getCandidatesForRarity(pool, rolledRarity);
        const selected = pickUniform(candidates, random.pickIndex);
        drawn.push(selected.id);

        const selectedIndex = pool.findIndex((card) => card.id === selected.id);
        pool.splice(selectedIndex, 1);
    }

    ensureMinimumRarePlusCard(drawn, cardsById, pool, random);

    return drawn;
};
