import type { HttpContext } from "@adonisjs/core/http";
import { cancelGameSearch, cancelSchema } from "./cancel_game_search.js";
import { countActiveGames } from "./count_active_games.js";
import { createTrainingGame } from "./create_training_game.js";
import { gameSearch } from "./game_search.js";
import { gameSearchHeartbeat, heartbeatSchema } from "./game_search_heartbeat.js";
import { showGame, showGameQueryValidator } from "./show_game.js";

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
        const { searchSessionId } = await ctx.request.validateUsing(cancelSchema);
        return cancelGameSearch(ctx, searchSessionId);
    }

    async searchHeartbeat(ctx: HttpContext) {
        const { searchSessionId } = await ctx.request.validateUsing(heartbeatSchema);
        return gameSearchHeartbeat(ctx, searchSessionId);
    }

    async activeCount() {
        return countActiveGames();
    }

    async show(ctx: HttpContext) {
        const { asUserId } = await ctx.request.validateUsing(showGameQueryValidator);
        return showGame(ctx, asUserId);
    }

    async update(ctx: HttpContext) {
        return ctx.response.notImplemented({ error: "Not implemented" });
    }

    async destroy(ctx: HttpContext) {
        return ctx.response.notImplemented({ error: "Not implemented" });
    }
}
