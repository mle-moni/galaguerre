import vine, { SimpleMessagesProvider } from "@vinejs/vine";
import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";

const deckCardEntrySchema = vine.object({
    cardId: vine.number(),
    count: vine.number().min(1).max(2),
});

export const updateDeckSchema = vine.create({
    name: vine.string().trim().minLength(1).maxLength(50),
    cards: vine.array(deckCardEntrySchema),
});

export const updateDeckMessagesProvider = new SimpleMessagesProvider(
    DEFAULT_MESSAGE_PROVIDER_CONFIG,
    {
        name: "nom",
    },
);
