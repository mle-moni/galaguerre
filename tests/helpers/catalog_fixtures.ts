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
    const data = overrides.data ?? defaultMinionData();

    const card = new Card();
    card.id = overrides.id ?? 1;
    card.label = overrides.label ?? "Test Card";
    card.cost = overrides.cost ?? 1;
    card.imageUrl = overrides.imageUrl ?? "https://example.com/card.png";
    card.cardSetId = overrides.cardSetId ?? 1;
    card.data = parseCardData(data);
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
