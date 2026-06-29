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
import CardSetsController from "#controllers/card_sets/card_sets_controller";
import CollectionController from "#controllers/collection/collection_controller";
import DecksController from "#controllers/decks/decks_controller";
import FriendsController from "#controllers/friends/friends_controller";
import GameHistoryController from "#controllers/game_history/game_history_controller";
import GamesController from "#controllers/games/games_controller";
import LeaderboardController from "#controllers/leaderboard/leaderboard_controller";
import RewardsController from "#controllers/rewards/rewards_controller";
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
        router.get("/leaderboard/ai-speedrun", [LeaderboardController, "aiSpeedrun"]);
        router.get("/game-history/:userId", [GameHistoryController, "index"]);
        router.get("/game-history/:userId/:gameId", [GameHistoryController, "show"]);
        router.get("/game-history/:userId/:gameId/replay", [GameHistoryController, "replay"]);
    })
    .prefix("/api");

// authenticated routes
router
    .group(() => {
        router.get("/auth/me", [AuthController, "me"]);
        router.get("/cards", [CardsController, "index"]);
        router.get("/card-sets", [CardSetsController, "index"]);
        router.get("/collection", [CollectionController, "index"]);
        router.get("/collection/duplicates-preview", [CollectionController, "duplicatesPreview"]);
        router.post("/collection/sell-duplicates", [CollectionController, "sellDuplicates"]);
        router.post("/collection/buy-card", [CollectionController, "buyCard"]);
        router.get("/packs", [CollectionController, "packs"]);
        router.post("/packs/open", [CollectionController, "openPack"]);
        router.post("/packs/buy", [RewardsController, "buyPack"]);
        router.post("/rewards/daily-pack", [RewardsController, "claimDailyPack"]);
        router.get("/friends", [FriendsController, "index"]);
        router.get("/friends/search", [FriendsController, "search"]);
        router.post("/friends", [FriendsController, "store"]);
        router.delete("/friends/:friendUserId", [FriendsController, "destroy"]);
        router.post("/decks/:id/select", [DecksController, "select"]);
        router.resource("decks", DecksController).apiOnly();
        router.post("/games/training", [GamesController, "training"]);
        router.delete("/games/search", [GamesController, "cancelSearch"]);
        router.post("/games/search/heartbeat", [GamesController, "searchHeartbeat"]);
        router.resource("games", GamesController).apiOnly();
    })
    .use(middleware.auth())
    .prefix("/api");

router.get("/*", async ({ view }) => view.render("index"));

router.post("/*", async ({ response, request }) =>
    response.notFound({ error: `404: POST ${request.url()}` }),
);
