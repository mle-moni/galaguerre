import type { HttpContext } from "@adonisjs/core/http";
import vine, { SimpleMessagesProvider } from "@vinejs/vine";

import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";
import { assertValidAvatarCardId, InvalidAvatarCardIdError } from "#services/avatars/avatar_cards";

export const updateAvatarSchema = vine.create({
    avatarCardId: vine.number(),
});

export const updateAvatarMessagesProvider = new SimpleMessagesProvider(
    DEFAULT_MESSAGE_PROVIDER_CONFIG,
    {
        avatarCardId: "avatar",
    },
);

export const updateAvatar = async ({ auth, request, response }: HttpContext) => {
    const user = auth.user;

    if (!user) {
        return response.unauthorized({ error: "Vous n'êtes pas connecté" });
    }

    const { avatarCardId } = await request.validateUsing(updateAvatarSchema, {
        messagesProvider: updateAvatarMessagesProvider,
    });

    try {
        await assertValidAvatarCardId(avatarCardId);
    } catch (error) {
        if (error instanceof InvalidAvatarCardIdError) {
            return response.badRequest({ error: error.message });
        }

        throw error;
    }

    user.avatarCardId = avatarCardId;
    await user.save();

    return { avatarCardId: user.avatarCardId };
};
