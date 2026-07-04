import vine, { SimpleMessagesProvider } from "@vinejs/vine";
import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";

export const importDeckSchema = vine.create({
    shareCode: vine.string().trim().minLength(1).maxLength(12),
});

export const importDeckMessagesProvider = new SimpleMessagesProvider(
    DEFAULT_MESSAGE_PROVIDER_CONFIG,
    {
        shareCode: "code de partage",
    },
);
