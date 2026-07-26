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

import { controllers } from "#generated/controllers";
import { registerUploadRoute } from "../app/utils/files.js";
import { middleware } from "./kernel.js";

registerUploadRoute();

// public routes
router
    .group(() => {
        router.get("/", () => ({ message: "Galaguerre API" }));
        router.post("/auth/login", [controllers.auth.Auth, "login"]);
        router.post("/auth/register", [controllers.auth.Auth, "register"]);
        router.post("/auth/logout", [controllers.auth.Auth, "logout"]);
        router.get("/leaderboard", [controllers.leaderboard.Leaderboard, "index"]);
        router.get("/leaderboard/ai-speedrun", [controllers.leaderboard.Leaderboard, "aiSpeedrun"]);
        router.get("/game-history/:userId", [controllers.gameHistory.GameHistory, "index"]);
        router.get("/game-history/:userId/:gameId", [controllers.gameHistory.GameHistory, "show"]);
        router.get("/game-history/:userId/:gameId/replay", [
            controllers.gameHistory.GameHistory,
            "replay",
        ]);
        router.get("/deck-shares/:code", [controllers.deckShares.DeckShares, "show"]);
        router.get("/cards", [controllers.cards.Cards, "index"]);
    })
    .prefix("/api");

// authenticated routes
router
    .group(() => {
        router.get("/auth/me", [controllers.auth.Auth, "me"]);
        router.patch("/auth/avatar", [controllers.auth.Auth, "updateAvatar"]);
        router.get("/card-sets", [controllers.cardSets.CardSets, "index"]);
        router.get("/collection", [controllers.collection.Collection, "index"]);
        router.get("/collection/duplicates-preview", [
            controllers.collection.Collection,
            "duplicatesPreview",
        ]);
        router.post("/collection/sell-duplicates", [
            controllers.collection.Collection,
            "sellDuplicates",
        ]);
        router.post("/collection/buy-card", [controllers.collection.Collection, "buyCard"]);
        router.post("/collection/sell-card", [controllers.collection.Collection, "sellCard"]);
        router.get("/packs", [controllers.collection.Collection, "packs"]);
        router.post("/packs/open", [controllers.collection.Collection, "openPack"]);
        router.post("/packs/buy", [controllers.rewards.Rewards, "buyPack"]);
        router.post("/rewards/daily-pack", [controllers.rewards.Rewards, "claimDailyPack"]);
        router.post("/presence/heartbeat", [controllers.presence.Presence, "heartbeat"]);
        router.get("/daily-quests", [controllers.dailyQuests.DailyQuests, "index"]);
        router.post("/daily-quests/:id/claim", [controllers.dailyQuests.DailyQuests, "claim"]);
        router.post("/progression/levels/:level/claim", [
            controllers.progression.Progression,
            "claim",
        ]);
        router.get("/friends", [controllers.friends.Friends, "index"]);
        router.get("/friends/search", [controllers.friends.Friends, "search"]);
        router.post("/friends", [controllers.friends.Friends, "store"]);
        router.delete("/friends/:friendUserId", [controllers.friends.Friends, "destroy"]);
        router.get("/friend-requests", [controllers.friends.FriendRequests, "index"]);
        router.get("/friend-requests/sent", [controllers.friends.FriendRequests, "sent"]);
        router.post("/friend-requests/:id/accept", [controllers.friends.FriendRequests, "accept"]);
        router.delete("/friend-requests/:id", [controllers.friends.FriendRequests, "destroy"]);
        router.get("/game-invites", [controllers.gameInvites.GameInvites, "index"]);
        router.get("/game-invites/sent", [controllers.gameInvites.GameInvites, "sent"]);
        router.post("/game-invites", [controllers.gameInvites.GameInvites, "store"]);
        router.post("/game-invites/:id/accept", [controllers.gameInvites.GameInvites, "accept"]);
        router.delete("/game-invites/:id", [controllers.gameInvites.GameInvites, "destroy"]);
        router.get("/events", [controllers.events.Events, "index"]);
        router.post("/events/:id/register", [controllers.events.Events, "register"]);
        router.post("/decks/:id/select", [controllers.decks.Decks, "select"]);
        router.post("/decks/:deckId/share", [controllers.deckShares.DeckShares, "store"]);
        router.post("/decks/import", [controllers.deckShares.DeckShares, "import"]);
        router.resource("decks", controllers.decks.Decks).apiOnly();
        router.post("/games/training", [controllers.games.Games, "training"]);
        router.get("/games/active-count", [controllers.games.Games, "activeCount"]);
        router.delete("/games/search", [controllers.games.Games, "cancelSearch"]);
        router.post("/games/search/heartbeat", [controllers.games.Games, "searchHeartbeat"]);
        router.resource("games", controllers.games.Games).apiOnly();
        // Explicit name: Adonis would register `dev_stats.v_1` from method `v1`, but Tuyau
        // resolves `client.api.devStats.v1` → `dev_stats.v1`.
        router.get("/dev/stats/v1", [controllers.dev.stats.DevStats, "v1"]).as("dev_stats.v1");
    })
    .use(middleware.auth())
    .prefix("/api");

router.get("/*", async ({ view }) => view.render("index"));

router.post("/*", async ({ response, request }) =>
    response.notFound({ error: `404: POST ${request.url()}` }),
);
