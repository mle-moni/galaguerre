import type { HttpContext } from "@adonisjs/core/http";
import { listActiveCardSets } from "./list_card_sets.js";

export default class CardSetsController {
    async index(ctx: HttpContext) {
        return listActiveCardSets(ctx);
    }
}
