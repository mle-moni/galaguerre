import type { CancelGameSearchResponse } from "#api_types/matchmaking.types";
import { cancelSearch } from "#services/sockets/matchmaking";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";

const cancelSchema = vine.compile(
    vine.object({
        searchSessionId: vine.string(),
    }),
);

export const cancelGameSearch = async ({ auth, request, response }: HttpContext) => {
    const user = auth.user!;
    const [errors, body] = await cancelSchema.tryValidate(request.body());

    if (errors) {
        return response.badRequest({ error: "searchSessionId is required" });
    }

    const cancelled = cancelSearch(body.searchSessionId, user.id);

    if (!cancelled) {
        return response.notFound({ error: "No active search session found" });
    }

    const result: CancelGameSearchResponse = { message: "Search cancelled" };
    return result;
};
