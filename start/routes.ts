/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from "@adonisjs/core/services/router";

import "#adomin/routes/adomin_router";
import "../app/dbml/dbml_router.js";

import AuthController from "#controllers/auth/auth_controller";
import CardsController from "#controllers/cards/cards_controller";
import DecksController from "#controllers/decks/decks_controller";
import GameHistoryController from "#controllers/game_history/game_history_controller";
import GamesController from "#controllers/games/games_controller";
import LeaderboardController from "#controllers/leaderboard/leaderboard_controller";
import { registerUploadRoute } from "../app/utils/files.js";
import { middleware } from "./kernel.js";

registerUploadRoute();

// public routes
router
    .group(() => {
        router.get("/", () => ({ message: "Galaguerre API" }));
        router.post("/auth/login", [AuthController, "login"]);
        router.post("/auth/register", [AuthController, "register"]);
        router.post("/auth/logout", [AuthController, "logout"]);
        router.get("/leaderboard", [LeaderboardController, "index"]);
        router.get("/game-history/:userId", [GameHistoryController, "index"]);
        router.get("/game-history/:userId/:gameId", [GameHistoryController, "show"]);
    })
    .prefix("/api");

// authenticated routes
router
    .group(() => {
        router.get("/auth/me", [AuthController, "me"]);
        router.get("/cards", [CardsController, "index"]);
        router.post("/decks/:id/select", [DecksController, "select"]);
        router.resource("decks", DecksController).apiOnly();
        router.resource("games", GamesController).apiOnly();
    })
    .use(middleware.auth())
    .prefix("/api");

router.get("/*", async ({ view }) => view.render("index"));

router.post("/*", async ({ response, request }) =>
    response.notFound({ error: `404: POST ${request.url()}` }),
);
