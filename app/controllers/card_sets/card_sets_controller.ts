import type { ApiCardSet } from "#api_types/deck.types";
import type { HttpContext } from "@adonisjs/core/http";
import { listActiveCardSets } from "./list_card_sets.js";

export default class CardSetsController {
    async index(ctx: HttpContext): Promise<ApiCardSet[]> {
        return listActiveCardSets(ctx);
    }
}
