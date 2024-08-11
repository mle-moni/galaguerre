import type { ApiUser } from "#api_types/auth.types";
import type { HttpContext } from "@adonisjs/core/http";

// biome-ignore lint/suspicious/noConfusingVoidType:
export const me = async ({ auth, response }: HttpContext): Promise<ApiUser | void> => {
    const user = auth.user;

    if (!user) return response.unauthorized({ message: "Aucun utilisateur connecté" });

    return {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
    };
};
