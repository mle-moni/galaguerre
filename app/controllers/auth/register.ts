import type { HttpContext } from "@adonisjs/core/http";
import vine, { SimpleMessagesProvider } from "@vinejs/vine";

import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";
import User from "#models/user";

const registerSchema = vine.compile(
    vine.object({
        email: vine.string().trim(),
        pseudo: vine.string().trim(),
        password: vine.string().trim(),
    }),
);

const messagesProvider = new SimpleMessagesProvider(DEFAULT_MESSAGE_PROVIDER_CONFIG, {
    password: "mot de passe",
});

export const register = async ({ request, response }: HttpContext) => {
    const { email, password, pseudo } = await request.validateUsing(registerSchema, {
        messagesProvider,
    });

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

    return createdUser;
};
