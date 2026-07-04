import type { ApiCatalogCard } from "#api_types/deck.types";
import type { HttpContext } from "@adonisjs/core/http";
import { listCards, listCardsValidator } from "./list_cards.js";

export default class CardsController {
    async index(ctx: HttpContext): Promise<ApiCatalogCard[]> {
        const { includeNonCollectible = false } =
            await ctx.request.validateUsing(listCardsValidator);

        return listCards(ctx, includeNonCollectible);
    }
}
