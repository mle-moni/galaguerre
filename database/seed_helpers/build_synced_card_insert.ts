import type { CardSeedEntry } from "#database/seed_data/cards/define_card";
import { buildCardInsert } from "#database/seed_data/cards/define_card";
import { generateCardDescriptionFromData } from "#galaguerre/generate_card_description";

export const buildSyncedCardInsert = (entry: CardSeedEntry, cardSetId: number) => ({
    ...buildCardInsert(entry, cardSetId),
    generatedDescription: generateCardDescriptionFromData(entry.data),
});
