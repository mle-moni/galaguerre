import Card from "#models/card";
import type { CardData } from "#galaguerre/card_definition.schema";
import { parseCardData } from "#galaguerre/card_definition.schema";
import { defaultMinionData } from "#database/seed_data/cards/define_card";

export const createTestCard = (overrides: {
    id?: number;
    label?: string;
    cost?: number;
    imageUrl?: string;
    cardSetId?: number;
    data?: CardData;
}): Card => {
    const baseData = overrides.data ?? defaultMinionData();

    const card = new Card();
    card.id = overrides.id ?? 1;
    card.cardSetId = overrides.cardSetId ?? 1;
    card.data = parseCardData({
        ...baseData,
        name: overrides.label ?? baseData.name,
        cost: overrides.cost ?? baseData.cost,
        imageUrl: overrides.imageUrl ?? baseData.imageUrl,
    });
    return card;
};

export const createTestMinionCard = (
    overrides: Parameters<typeof createTestCard>[0] & {
        data?: Partial<Extract<CardData, { type: "MINION" }>>;
    } = {},
): Card => {
    const data = {
        ...defaultMinionData(),
        ...overrides.data,
    };

    return createTestCard({ ...overrides, data });
};
