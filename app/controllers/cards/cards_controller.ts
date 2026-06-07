import type { HttpContext } from "@adonisjs/core/http";
import { listCards } from "./list_cards.js";

export default class CardsController {
    async index(ctx: HttpContext) {
        return listCards(ctx);
    }
}
