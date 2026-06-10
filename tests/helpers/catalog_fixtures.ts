import Card from "#models/card";
import type { CardData } from "#galaguerre/card_definition.schema";
import { parseCardData } from "#galaguerre/card_definition.schema";
import type { GalaguerreCardType } from "#galaguerre/galaguerre.types";
import { defaultMinionData } from "#database/seed_data/cards/define_card";

export const createTestCard = (overrides: {
    id?: number;
    label?: string;
    cost?: number;
    type?: GalaguerreCardType;
    imageUrl?: string;
    cardSetId?: number;
    data?: CardData;
}): Card => {
    const type = overrides.type ?? "MINION";
    const data = overrides.data ?? defaultMinionData();

    const card = new Card();
    card.id = overrides.id ?? 1;
    card.label = overrides.label ?? "Test Card";
    card.cost = overrides.cost ?? 1;
    card.type = type;
    card.imageUrl = overrides.imageUrl ?? "https://example.com/card.png";
    card.cardSetId = overrides.cardSetId ?? 1;
    card.data = parseCardData(type, data);
    return card;
};

export const createTestMinionCard = (
    overrides: Parameters<typeof createTestCard>[0] & {
        data?: Partial<Extract<CardData, { attack: number }>>;
    } = {},
): Card => {
    const data = {
        ...defaultMinionData(),
        ...overrides.data,
    };

    return createTestCard({ ...overrides, type: "MINION", data });
};
