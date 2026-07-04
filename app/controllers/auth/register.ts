import type { HttpContext } from "@adonisjs/core/http";
import vine, { SimpleMessagesProvider } from "@vinejs/vine";

import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";
import User from "#models/user";
import { createStarterDeckForUser } from "#services/decks/create_starter_deck_for_user";

export const registerSchema = vine.create({
    email: vine.string().trim(),
    pseudo: vine.string().trim(),
    password: vine.string().trim(),
});

export const registerMessagesProvider = new SimpleMessagesProvider(
    DEFAULT_MESSAGE_PROVIDER_CONFIG,
    {
        password: "mot de passe",
    },
);

export const registerUser = async (
    { response }: HttpContext,
    { email, password, pseudo }: { email: string; password: string; pseudo: string },
) => {
    const foundUser = await User.query()
        .whereILike("email", email)
        .orWhereILike("pseudo", pseudo)
        .first();

    if (foundUser && foundUser.email.toLowerCase() === email.toLowerCase()) {
        return response.badRequest({ error: "Cet email est déjà utilisé" });
    }

    if (foundUser) return response.badRequest({ error: "Ce pseudo est déjà utilisé" });

    const createdUser = await User.create({
        email,
        pseudo,
        password,
    });

    await createStarterDeckForUser(createdUser.id);

    const accessToken = await User.accessTokens.create(createdUser);

    return { token: accessToken.value!.release() };
};

export const register = async (ctx: HttpContext) => {
    const { email, password, pseudo } = await ctx.request.validateUsing(registerSchema, {
        messagesProvider: registerMessagesProvider,
    });

    return registerUser(ctx, { email, password, pseudo });
};
