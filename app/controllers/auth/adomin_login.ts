import type { HttpContext } from "@adonisjs/core/http";
import vine, { SimpleMessagesProvider } from "@vinejs/vine";

import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";
import User from "#models/user";

export const loginSchema = vine.create({
    email: vine.string().trim(),
    password: vine.string().trim(),
});

export const loginMessagesProvider = new SimpleMessagesProvider(DEFAULT_MESSAGE_PROVIDER_CONFIG, {
    password: "mot de passe",
});

export const createLoginToken = async (email: string, password: string) => {
    const user = await User.verifyCredentials(email, password);
    return User.accessTokens.create(user);
};

export const adominLogin = async ({ request }: HttpContext) => {
    const { email, password } = await request.validateUsing(loginSchema, {
        messagesProvider: loginMessagesProvider,
    });

    return createLoginToken(email, password);
};
