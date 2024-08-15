import type { HttpContext } from "@adonisjs/core/http";
import { gameSearch } from "./game_search.js";
import { showGame } from "./show_game.js";

export default class GamesController {
    async index(ctx: HttpContext) {
        return ctx.response.notImplemented({ error: "Not implemented" });
    }

    async store(ctx: HttpContext) {
        return gameSearch(ctx);
    }

    async show(ctx: HttpContext) {
        return showGame(ctx);
    }

    async update(ctx: HttpContext) {
        return ctx.response.notImplemented({ error: "Not implemented" });
    }

    async destroy(ctx: HttpContext) {
        return ctx.response.notImplemented({ error: "Not implemented" });
    }
}
