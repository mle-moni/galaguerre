import type { ApiCatalogCard } from "#api_types/deck.types";

export const MANA_CURVE_MIN_COST = 0;
export const MANA_CURVE_MAX_COST = 10;

export type ManaCurveBucket = {
    cost: number;
    minion: number;
    spell: number;
    weapon: number;
    total: number;
};

export type ManaCurveData = {
    buckets: ManaCurveBucket[];
    maxCount: number;
    averageCost: number;
    totalCards: number;
};

const emptyBucket = (cost: number): ManaCurveBucket => ({
    cost,
    minion: 0,
    spell: 0,
    weapon: 0,
    total: 0,
});

export const computeManaCurve = (
    composition: Map<number, number>,
    catalogById: Map<number, ApiCatalogCard>,
): ManaCurveData => {
    const buckets = Array.from({ length: MANA_CURVE_MAX_COST - MANA_CURVE_MIN_COST + 1 }, (_, i) =>
        emptyBucket(MANA_CURVE_MIN_COST + i),
    );

    let totalCards = 0;
    let weightedCostSum = 0;

    for (const [cardId, count] of composition) {
        const card = catalogById.get(cardId);
        if (!card || count <= 0) continue;

        const cost = Math.min(Math.max(card.cost, MANA_CURVE_MIN_COST), MANA_CURVE_MAX_COST);
        const bucket = buckets[cost];
        if (!bucket) continue;

        bucket[card.type === "MINION" ? "minion" : card.type === "SPELL" ? "spell" : "weapon"] +=
            count;
        bucket.total += count;
        totalCards += count;
        weightedCostSum += card.cost * count;
    }

    const maxCount = Math.max(1, ...buckets.map((b) => b.total));
    const averageCost = totalCards > 0 ? weightedCostSum / totalCards : 0;

    return { buckets, maxCount, averageCost, totalCards };
};
