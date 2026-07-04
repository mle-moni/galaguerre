import type { CancelGameSearchResponse } from "#api_types/matchmaking.types";
import { cancelSearch } from "#services/sockets/matchmaking";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";

export const cancelSchema = vine.create({
    searchSessionId: vine.string(),
});

export const cancelGameSearch = async (
    { auth, response }: HttpContext,
    searchSessionId: string,
) => {
    const user = auth.user!;
    const cancelled = cancelSearch(searchSessionId, user.id);

    if (!cancelled) {
        return response.notFound({ error: "No active search session found" });
    }

    const result: CancelGameSearchResponse = { message: "Search cancelled" };
    return result;
};
