/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from "@tuyau/core/types";
import type { Registry } from "./schema.d.ts";
import type { ApiDefinition } from "./tree.d.ts";

const placeholder: any = {};

const routes = {
    "auth.login": {
        methods: ["POST"],
        pattern: "/api/auth/login",
        tokens: [
            { old: "/api/auth/login", type: 0, val: "api", end: "" },
            { old: "/api/auth/login", type: 0, val: "auth", end: "" },
            { old: "/api/auth/login", type: 0, val: "login", end: "" },
        ],
        types: placeholder as Registry["auth.login"]["types"],
    },
    "auth.register": {
        methods: ["POST"],
        pattern: "/api/auth/register",
        tokens: [
            { old: "/api/auth/register", type: 0, val: "api", end: "" },
            { old: "/api/auth/register", type: 0, val: "auth", end: "" },
            { old: "/api/auth/register", type: 0, val: "register", end: "" },
        ],
        types: placeholder as Registry["auth.register"]["types"],
    },
    "auth.logout": {
        methods: ["POST"],
        pattern: "/api/auth/logout",
        tokens: [
            { old: "/api/auth/logout", type: 0, val: "api", end: "" },
            { old: "/api/auth/logout", type: 0, val: "auth", end: "" },
            { old: "/api/auth/logout", type: 0, val: "logout", end: "" },
        ],
        types: placeholder as Registry["auth.logout"]["types"],
    },
    "leaderboard.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/leaderboard",
        tokens: [
            { old: "/api/leaderboard", type: 0, val: "api", end: "" },
            { old: "/api/leaderboard", type: 0, val: "leaderboard", end: "" },
        ],
        types: placeholder as Registry["leaderboard.index"]["types"],
    },
    "leaderboard.ai_speedrun": {
        methods: ["GET", "HEAD"],
        pattern: "/api/leaderboard/ai-speedrun",
        tokens: [
            { old: "/api/leaderboard/ai-speedrun", type: 0, val: "api", end: "" },
            { old: "/api/leaderboard/ai-speedrun", type: 0, val: "leaderboard", end: "" },
            { old: "/api/leaderboard/ai-speedrun", type: 0, val: "ai-speedrun", end: "" },
        ],
        types: placeholder as Registry["leaderboard.ai_speedrun"]["types"],
    },
    "game_history.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/game-history/:userId",
        tokens: [
            { old: "/api/game-history/:userId", type: 0, val: "api", end: "" },
            { old: "/api/game-history/:userId", type: 0, val: "game-history", end: "" },
            { old: "/api/game-history/:userId", type: 1, val: "userId", end: "" },
        ],
        types: placeholder as Registry["game_history.index"]["types"],
    },
    "game_history.show": {
        methods: ["GET", "HEAD"],
        pattern: "/api/game-history/:userId/:gameId",
        tokens: [
            { old: "/api/game-history/:userId/:gameId", type: 0, val: "api", end: "" },
            { old: "/api/game-history/:userId/:gameId", type: 0, val: "game-history", end: "" },
            { old: "/api/game-history/:userId/:gameId", type: 1, val: "userId", end: "" },
            { old: "/api/game-history/:userId/:gameId", type: 1, val: "gameId", end: "" },
        ],
        types: placeholder as Registry["game_history.show"]["types"],
    },
    "game_history.replay": {
        methods: ["GET", "HEAD"],
        pattern: "/api/game-history/:userId/:gameId/replay",
        tokens: [
            { old: "/api/game-history/:userId/:gameId/replay", type: 0, val: "api", end: "" },
            {
                old: "/api/game-history/:userId/:gameId/replay",
                type: 0,
                val: "game-history",
                end: "",
            },
            { old: "/api/game-history/:userId/:gameId/replay", type: 1, val: "userId", end: "" },
            { old: "/api/game-history/:userId/:gameId/replay", type: 1, val: "gameId", end: "" },
            { old: "/api/game-history/:userId/:gameId/replay", type: 0, val: "replay", end: "" },
        ],
        types: placeholder as Registry["game_history.replay"]["types"],
    },
    "deck_shares.show": {
        methods: ["GET", "HEAD"],
        pattern: "/api/deck-shares/:code",
        tokens: [
            { old: "/api/deck-shares/:code", type: 0, val: "api", end: "" },
            { old: "/api/deck-shares/:code", type: 0, val: "deck-shares", end: "" },
            { old: "/api/deck-shares/:code", type: 1, val: "code", end: "" },
        ],
        types: placeholder as Registry["deck_shares.show"]["types"],
    },
    "cards.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/cards",
        tokens: [
            { old: "/api/cards", type: 0, val: "api", end: "" },
            { old: "/api/cards", type: 0, val: "cards", end: "" },
        ],
        types: placeholder as Registry["cards.index"]["types"],
    },
    "auth.me": {
        methods: ["GET", "HEAD"],
        pattern: "/api/auth/me",
        tokens: [
            { old: "/api/auth/me", type: 0, val: "api", end: "" },
            { old: "/api/auth/me", type: 0, val: "auth", end: "" },
            { old: "/api/auth/me", type: 0, val: "me", end: "" },
        ],
        types: placeholder as Registry["auth.me"]["types"],
    },
    "card_sets.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/card-sets",
        tokens: [
            { old: "/api/card-sets", type: 0, val: "api", end: "" },
            { old: "/api/card-sets", type: 0, val: "card-sets", end: "" },
        ],
        types: placeholder as Registry["card_sets.index"]["types"],
    },
    "collection.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/collection",
        tokens: [
            { old: "/api/collection", type: 0, val: "api", end: "" },
            { old: "/api/collection", type: 0, val: "collection", end: "" },
        ],
        types: placeholder as Registry["collection.index"]["types"],
    },
    "collection.duplicates_preview": {
        methods: ["GET", "HEAD"],
        pattern: "/api/collection/duplicates-preview",
        tokens: [
            { old: "/api/collection/duplicates-preview", type: 0, val: "api", end: "" },
            { old: "/api/collection/duplicates-preview", type: 0, val: "collection", end: "" },
            {
                old: "/api/collection/duplicates-preview",
                type: 0,
                val: "duplicates-preview",
                end: "",
            },
        ],
        types: placeholder as Registry["collection.duplicates_preview"]["types"],
    },
    "collection.sell_duplicates": {
        methods: ["POST"],
        pattern: "/api/collection/sell-duplicates",
        tokens: [
            { old: "/api/collection/sell-duplicates", type: 0, val: "api", end: "" },
            { old: "/api/collection/sell-duplicates", type: 0, val: "collection", end: "" },
            { old: "/api/collection/sell-duplicates", type: 0, val: "sell-duplicates", end: "" },
        ],
        types: placeholder as Registry["collection.sell_duplicates"]["types"],
    },
    "collection.buy_card": {
        methods: ["POST"],
        pattern: "/api/collection/buy-card",
        tokens: [
            { old: "/api/collection/buy-card", type: 0, val: "api", end: "" },
            { old: "/api/collection/buy-card", type: 0, val: "collection", end: "" },
            { old: "/api/collection/buy-card", type: 0, val: "buy-card", end: "" },
        ],
        types: placeholder as Registry["collection.buy_card"]["types"],
    },
    "collection.sell_card": {
        methods: ["POST"],
        pattern: "/api/collection/sell-card",
        tokens: [
            { old: "/api/collection/sell-card", type: 0, val: "api", end: "" },
            { old: "/api/collection/sell-card", type: 0, val: "collection", end: "" },
            { old: "/api/collection/sell-card", type: 0, val: "sell-card", end: "" },
        ],
        types: placeholder as Registry["collection.sell_card"]["types"],
    },
    "collection.packs": {
        methods: ["GET", "HEAD"],
        pattern: "/api/packs",
        tokens: [
            { old: "/api/packs", type: 0, val: "api", end: "" },
            { old: "/api/packs", type: 0, val: "packs", end: "" },
        ],
        types: placeholder as Registry["collection.packs"]["types"],
    },
    "collection.open_pack": {
        methods: ["POST"],
        pattern: "/api/packs/open",
        tokens: [
            { old: "/api/packs/open", type: 0, val: "api", end: "" },
            { old: "/api/packs/open", type: 0, val: "packs", end: "" },
            { old: "/api/packs/open", type: 0, val: "open", end: "" },
        ],
        types: placeholder as Registry["collection.open_pack"]["types"],
    },
    "rewards.buy_pack": {
        methods: ["POST"],
        pattern: "/api/packs/buy",
        tokens: [
            { old: "/api/packs/buy", type: 0, val: "api", end: "" },
            { old: "/api/packs/buy", type: 0, val: "packs", end: "" },
            { old: "/api/packs/buy", type: 0, val: "buy", end: "" },
        ],
        types: placeholder as Registry["rewards.buy_pack"]["types"],
    },
    "rewards.claim_daily_pack": {
        methods: ["POST"],
        pattern: "/api/rewards/daily-pack",
        tokens: [
            { old: "/api/rewards/daily-pack", type: 0, val: "api", end: "" },
            { old: "/api/rewards/daily-pack", type: 0, val: "rewards", end: "" },
            { old: "/api/rewards/daily-pack", type: 0, val: "daily-pack", end: "" },
        ],
        types: placeholder as Registry["rewards.claim_daily_pack"]["types"],
    },
    "presence.heartbeat": {
        methods: ["POST"],
        pattern: "/api/presence/heartbeat",
        tokens: [
            { old: "/api/presence/heartbeat", type: 0, val: "api", end: "" },
            { old: "/api/presence/heartbeat", type: 0, val: "presence", end: "" },
            { old: "/api/presence/heartbeat", type: 0, val: "heartbeat", end: "" },
        ],
        types: placeholder as Registry["presence.heartbeat"]["types"],
    },
    "daily_quests.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/daily-quests",
        tokens: [
            { old: "/api/daily-quests", type: 0, val: "api", end: "" },
            { old: "/api/daily-quests", type: 0, val: "daily-quests", end: "" },
        ],
        types: placeholder as Registry["daily_quests.index"]["types"],
    },
    "daily_quests.claim": {
        methods: ["POST"],
        pattern: "/api/daily-quests/:id/claim",
        tokens: [
            { old: "/api/daily-quests/:id/claim", type: 0, val: "api", end: "" },
            { old: "/api/daily-quests/:id/claim", type: 0, val: "daily-quests", end: "" },
            { old: "/api/daily-quests/:id/claim", type: 1, val: "id", end: "" },
            { old: "/api/daily-quests/:id/claim", type: 0, val: "claim", end: "" },
        ],
        types: placeholder as Registry["daily_quests.claim"]["types"],
    },
    "progression.claim": {
        methods: ["POST"],
        pattern: "/api/progression/levels/:level/claim",
        tokens: [
            { old: "/api/progression/levels/:level/claim", type: 0, val: "api", end: "" },
            { old: "/api/progression/levels/:level/claim", type: 0, val: "progression", end: "" },
            { old: "/api/progression/levels/:level/claim", type: 0, val: "levels", end: "" },
            { old: "/api/progression/levels/:level/claim", type: 1, val: "level", end: "" },
            { old: "/api/progression/levels/:level/claim", type: 0, val: "claim", end: "" },
        ],
        types: placeholder as Registry["progression.claim"]["types"],
    },
    "friends.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/friends",
        tokens: [
            { old: "/api/friends", type: 0, val: "api", end: "" },
            { old: "/api/friends", type: 0, val: "friends", end: "" },
        ],
        types: placeholder as Registry["friends.index"]["types"],
    },
    "friends.search": {
        methods: ["GET", "HEAD"],
        pattern: "/api/friends/search",
        tokens: [
            { old: "/api/friends/search", type: 0, val: "api", end: "" },
            { old: "/api/friends/search", type: 0, val: "friends", end: "" },
            { old: "/api/friends/search", type: 0, val: "search", end: "" },
        ],
        types: placeholder as Registry["friends.search"]["types"],
    },
    "friends.store": {
        methods: ["POST"],
        pattern: "/api/friends",
        tokens: [
            { old: "/api/friends", type: 0, val: "api", end: "" },
            { old: "/api/friends", type: 0, val: "friends", end: "" },
        ],
        types: placeholder as Registry["friends.store"]["types"],
    },
    "friends.destroy": {
        methods: ["DELETE"],
        pattern: "/api/friends/:friendUserId",
        tokens: [
            { old: "/api/friends/:friendUserId", type: 0, val: "api", end: "" },
            { old: "/api/friends/:friendUserId", type: 0, val: "friends", end: "" },
            { old: "/api/friends/:friendUserId", type: 1, val: "friendUserId", end: "" },
        ],
        types: placeholder as Registry["friends.destroy"]["types"],
    },
    "friend_requests.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/friend-requests",
        tokens: [
            { old: "/api/friend-requests", type: 0, val: "api", end: "" },
            { old: "/api/friend-requests", type: 0, val: "friend-requests", end: "" },
        ],
        types: placeholder as Registry["friend_requests.index"]["types"],
    },
    "friend_requests.sent": {
        methods: ["GET", "HEAD"],
        pattern: "/api/friend-requests/sent",
        tokens: [
            { old: "/api/friend-requests/sent", type: 0, val: "api", end: "" },
            { old: "/api/friend-requests/sent", type: 0, val: "friend-requests", end: "" },
            { old: "/api/friend-requests/sent", type: 0, val: "sent", end: "" },
        ],
        types: placeholder as Registry["friend_requests.sent"]["types"],
    },
    "friend_requests.accept": {
        methods: ["POST"],
        pattern: "/api/friend-requests/:id/accept",
        tokens: [
            { old: "/api/friend-requests/:id/accept", type: 0, val: "api", end: "" },
            { old: "/api/friend-requests/:id/accept", type: 0, val: "friend-requests", end: "" },
            { old: "/api/friend-requests/:id/accept", type: 1, val: "id", end: "" },
            { old: "/api/friend-requests/:id/accept", type: 0, val: "accept", end: "" },
        ],
        types: placeholder as Registry["friend_requests.accept"]["types"],
    },
    "friend_requests.destroy": {
        methods: ["DELETE"],
        pattern: "/api/friend-requests/:id",
        tokens: [
            { old: "/api/friend-requests/:id", type: 0, val: "api", end: "" },
            { old: "/api/friend-requests/:id", type: 0, val: "friend-requests", end: "" },
            { old: "/api/friend-requests/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["friend_requests.destroy"]["types"],
    },
    "game_invites.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/game-invites",
        tokens: [
            { old: "/api/game-invites", type: 0, val: "api", end: "" },
            { old: "/api/game-invites", type: 0, val: "game-invites", end: "" },
        ],
        types: placeholder as Registry["game_invites.index"]["types"],
    },
    "game_invites.sent": {
        methods: ["GET", "HEAD"],
        pattern: "/api/game-invites/sent",
        tokens: [
            { old: "/api/game-invites/sent", type: 0, val: "api", end: "" },
            { old: "/api/game-invites/sent", type: 0, val: "game-invites", end: "" },
            { old: "/api/game-invites/sent", type: 0, val: "sent", end: "" },
        ],
        types: placeholder as Registry["game_invites.sent"]["types"],
    },
    "game_invites.store": {
        methods: ["POST"],
        pattern: "/api/game-invites",
        tokens: [
            { old: "/api/game-invites", type: 0, val: "api", end: "" },
            { old: "/api/game-invites", type: 0, val: "game-invites", end: "" },
        ],
        types: placeholder as Registry["game_invites.store"]["types"],
    },
    "game_invites.accept": {
        methods: ["POST"],
        pattern: "/api/game-invites/:id/accept",
        tokens: [
            { old: "/api/game-invites/:id/accept", type: 0, val: "api", end: "" },
            { old: "/api/game-invites/:id/accept", type: 0, val: "game-invites", end: "" },
            { old: "/api/game-invites/:id/accept", type: 1, val: "id", end: "" },
            { old: "/api/game-invites/:id/accept", type: 0, val: "accept", end: "" },
        ],
        types: placeholder as Registry["game_invites.accept"]["types"],
    },
    "game_invites.destroy": {
        methods: ["DELETE"],
        pattern: "/api/game-invites/:id",
        tokens: [
            { old: "/api/game-invites/:id", type: 0, val: "api", end: "" },
            { old: "/api/game-invites/:id", type: 0, val: "game-invites", end: "" },
            { old: "/api/game-invites/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["game_invites.destroy"]["types"],
    },
    "events.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/events",
        tokens: [
            { old: "/api/events", type: 0, val: "api", end: "" },
            { old: "/api/events", type: 0, val: "events", end: "" },
        ],
        types: placeholder as Registry["events.index"]["types"],
    },
    "events.register": {
        methods: ["POST"],
        pattern: "/api/events/:id/register",
        tokens: [
            { old: "/api/events/:id/register", type: 0, val: "api", end: "" },
            { old: "/api/events/:id/register", type: 0, val: "events", end: "" },
            { old: "/api/events/:id/register", type: 1, val: "id", end: "" },
            { old: "/api/events/:id/register", type: 0, val: "register", end: "" },
        ],
        types: placeholder as Registry["events.register"]["types"],
    },
    "decks.select": {
        methods: ["POST"],
        pattern: "/api/decks/:id/select",
        tokens: [
            { old: "/api/decks/:id/select", type: 0, val: "api", end: "" },
            { old: "/api/decks/:id/select", type: 0, val: "decks", end: "" },
            { old: "/api/decks/:id/select", type: 1, val: "id", end: "" },
            { old: "/api/decks/:id/select", type: 0, val: "select", end: "" },
        ],
        types: placeholder as Registry["decks.select"]["types"],
    },
    "deck_shares.store": {
        methods: ["POST"],
        pattern: "/api/decks/:deckId/share",
        tokens: [
            { old: "/api/decks/:deckId/share", type: 0, val: "api", end: "" },
            { old: "/api/decks/:deckId/share", type: 0, val: "decks", end: "" },
            { old: "/api/decks/:deckId/share", type: 1, val: "deckId", end: "" },
            { old: "/api/decks/:deckId/share", type: 0, val: "share", end: "" },
        ],
        types: placeholder as Registry["deck_shares.store"]["types"],
    },
    "deck_shares.import": {
        methods: ["POST"],
        pattern: "/api/decks/import",
        tokens: [
            { old: "/api/decks/import", type: 0, val: "api", end: "" },
            { old: "/api/decks/import", type: 0, val: "decks", end: "" },
            { old: "/api/decks/import", type: 0, val: "import", end: "" },
        ],
        types: placeholder as Registry["deck_shares.import"]["types"],
    },
    "decks.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/decks",
        tokens: [
            { old: "/api/decks", type: 0, val: "api", end: "" },
            { old: "/api/decks", type: 0, val: "decks", end: "" },
        ],
        types: placeholder as Registry["decks.index"]["types"],
    },
    "decks.store": {
        methods: ["POST"],
        pattern: "/api/decks",
        tokens: [
            { old: "/api/decks", type: 0, val: "api", end: "" },
            { old: "/api/decks", type: 0, val: "decks", end: "" },
        ],
        types: placeholder as Registry["decks.store"]["types"],
    },
    "decks.show": {
        methods: ["GET", "HEAD"],
        pattern: "/api/decks/:id",
        tokens: [
            { old: "/api/decks/:id", type: 0, val: "api", end: "" },
            { old: "/api/decks/:id", type: 0, val: "decks", end: "" },
            { old: "/api/decks/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["decks.show"]["types"],
    },
    "decks.update": {
        methods: ["PUT", "PATCH"],
        pattern: "/api/decks/:id",
        tokens: [
            { old: "/api/decks/:id", type: 0, val: "api", end: "" },
            { old: "/api/decks/:id", type: 0, val: "decks", end: "" },
            { old: "/api/decks/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["decks.update"]["types"],
    },
    "decks.destroy": {
        methods: ["DELETE"],
        pattern: "/api/decks/:id",
        tokens: [
            { old: "/api/decks/:id", type: 0, val: "api", end: "" },
            { old: "/api/decks/:id", type: 0, val: "decks", end: "" },
            { old: "/api/decks/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["decks.destroy"]["types"],
    },
    "games.training": {
        methods: ["POST"],
        pattern: "/api/games/training",
        tokens: [
            { old: "/api/games/training", type: 0, val: "api", end: "" },
            { old: "/api/games/training", type: 0, val: "games", end: "" },
            { old: "/api/games/training", type: 0, val: "training", end: "" },
        ],
        types: placeholder as Registry["games.training"]["types"],
    },
    "games.cancel_search": {
        methods: ["DELETE"],
        pattern: "/api/games/search",
        tokens: [
            { old: "/api/games/search", type: 0, val: "api", end: "" },
            { old: "/api/games/search", type: 0, val: "games", end: "" },
            { old: "/api/games/search", type: 0, val: "search", end: "" },
        ],
        types: placeholder as Registry["games.cancel_search"]["types"],
    },
    "games.search_heartbeat": {
        methods: ["POST"],
        pattern: "/api/games/search/heartbeat",
        tokens: [
            { old: "/api/games/search/heartbeat", type: 0, val: "api", end: "" },
            { old: "/api/games/search/heartbeat", type: 0, val: "games", end: "" },
            { old: "/api/games/search/heartbeat", type: 0, val: "search", end: "" },
            { old: "/api/games/search/heartbeat", type: 0, val: "heartbeat", end: "" },
        ],
        types: placeholder as Registry["games.search_heartbeat"]["types"],
    },
    "games.index": {
        methods: ["GET", "HEAD"],
        pattern: "/api/games",
        tokens: [
            { old: "/api/games", type: 0, val: "api", end: "" },
            { old: "/api/games", type: 0, val: "games", end: "" },
        ],
        types: placeholder as Registry["games.index"]["types"],
    },
    "games.store": {
        methods: ["POST"],
        pattern: "/api/games",
        tokens: [
            { old: "/api/games", type: 0, val: "api", end: "" },
            { old: "/api/games", type: 0, val: "games", end: "" },
        ],
        types: placeholder as Registry["games.store"]["types"],
    },
    "games.show": {
        methods: ["GET", "HEAD"],
        pattern: "/api/games/:id",
        tokens: [
            { old: "/api/games/:id", type: 0, val: "api", end: "" },
            { old: "/api/games/:id", type: 0, val: "games", end: "" },
            { old: "/api/games/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["games.show"]["types"],
    },
    "games.update": {
        methods: ["PUT", "PATCH"],
        pattern: "/api/games/:id",
        tokens: [
            { old: "/api/games/:id", type: 0, val: "api", end: "" },
            { old: "/api/games/:id", type: 0, val: "games", end: "" },
            { old: "/api/games/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["games.update"]["types"],
    },
    "games.destroy": {
        methods: ["DELETE"],
        pattern: "/api/games/:id",
        tokens: [
            { old: "/api/games/:id", type: 0, val: "api", end: "" },
            { old: "/api/games/:id", type: 0, val: "games", end: "" },
            { old: "/api/games/:id", type: 1, val: "id", end: "" },
        ],
        types: placeholder as Registry["games.destroy"]["types"],
    },
} as const satisfies Record<string, AdonisEndpoint>;

export { routes };

export const registry = {
    routes,
    $tree: {} as ApiDefinition,
};

declare module "@tuyau/core/types" {
    export interface UserRegistry {
        routes: typeof routes;
        $tree: ApiDefinition;
    }
}
