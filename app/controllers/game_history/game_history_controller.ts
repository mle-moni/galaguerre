import type { HttpContext } from "@adonisjs/core/http";
import { listUserGames } from "./list_user_games.js";
import { showUserGame } from "./show_user_game.js";

export default class GameHistoryController {
    async index(ctx: HttpContext) {
        return listUserGames(ctx);
    }

    async show(ctx: HttpContext) {
        return showUserGame(ctx);
    }
}
