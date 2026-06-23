import type { HttpContext } from "@adonisjs/core/http";
import { cancelGameSearch } from "./cancel_game_search.js";
import { createTrainingGame } from "./create_training_game.js";
import { gameSearch } from "./game_search.js";
import { gameSearchHeartbeat } from "./game_search_heartbeat.js";
import { showGame } from "./show_game.js";

export default class GamesController {
    async index(ctx: HttpContext) {
        return ctx.response.notImplemented({ error: "Not implemented" });
    }

    async store(ctx: HttpContext) {
        return gameSearch(ctx);
    }

    async training(ctx: HttpContext) {
        return createTrainingGame(ctx);
    }

    async cancelSearch(ctx: HttpContext) {
        return cancelGameSearch(ctx);
    }

    async searchHeartbeat(ctx: HttpContext) {
        return gameSearchHeartbeat(ctx);
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
