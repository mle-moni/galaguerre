import "@adonisjs/core/types/http";

type ParamValue = string | number | bigint | boolean;

export type ScannedRoutes = {
    ALL: {
        "auth.login": { paramsTuple?: []; params?: {} };
        "auth.register": { paramsTuple?: []; params?: {} };
        "auth.logout": { paramsTuple?: []; params?: {} };
        "leaderboard.index": { paramsTuple?: []; params?: {} };
        "leaderboard.ai_speedrun": { paramsTuple?: []; params?: {} };
        "game_history.index": { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
        "game_history.show": {
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
        };
        "game_history.replay": {
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
        };
        "deck_shares.show": { paramsTuple: [ParamValue]; params: { code: ParamValue } };
        "cards.index": { paramsTuple?: []; params?: {} };
        "auth.me": { paramsTuple?: []; params?: {} };
        "auth.update_avatar": { paramsTuple?: []; params?: {} };
        "card_sets.index": { paramsTuple?: []; params?: {} };
        "collection.index": { paramsTuple?: []; params?: {} };
        "collection.duplicates_preview": { paramsTuple?: []; params?: {} };
        "collection.sell_duplicates": { paramsTuple?: []; params?: {} };
        "collection.buy_card": { paramsTuple?: []; params?: {} };
        "collection.sell_card": { paramsTuple?: []; params?: {} };
        "collection.packs": { paramsTuple?: []; params?: {} };
        "collection.open_pack": { paramsTuple?: []; params?: {} };
        "rewards.buy_pack": { paramsTuple?: []; params?: {} };
        "rewards.claim_daily_pack": { paramsTuple?: []; params?: {} };
        "presence.heartbeat": { paramsTuple?: []; params?: {} };
        "daily_quests.index": { paramsTuple?: []; params?: {} };
        "daily_quests.claim": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "progression.claim": { paramsTuple: [ParamValue]; params: { level: ParamValue } };
        "friends.index": { paramsTuple?: []; params?: {} };
        "friends.search": { paramsTuple?: []; params?: {} };
        "friends.store": { paramsTuple?: []; params?: {} };
        "friends.destroy": { paramsTuple: [ParamValue]; params: { friendUserId: ParamValue } };
        "friend_requests.index": { paramsTuple?: []; params?: {} };
        "friend_requests.sent": { paramsTuple?: []; params?: {} };
        "friend_requests.accept": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "friend_requests.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "game_invites.index": { paramsTuple?: []; params?: {} };
        "game_invites.sent": { paramsTuple?: []; params?: {} };
        "game_invites.store": { paramsTuple?: []; params?: {} };
        "game_invites.accept": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "game_invites.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "events.index": { paramsTuple?: []; params?: {} };
        "events.register": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "decks.select": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "deck_shares.store": { paramsTuple: [ParamValue]; params: { deckId: ParamValue } };
        "deck_shares.import": { paramsTuple?: []; params?: {} };
        "decks.index": { paramsTuple?: []; params?: {} };
        "decks.store": { paramsTuple?: []; params?: {} };
        "decks.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "decks.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "decks.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.training": { paramsTuple?: []; params?: {} };
        "games.cancel_search": { paramsTuple?: []; params?: {} };
        "games.search_heartbeat": { paramsTuple?: []; params?: {} };
        "games.index": { paramsTuple?: []; params?: {} };
        "games.store": { paramsTuple?: []; params?: {} };
        "games.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    GET: {
        "leaderboard.index": { paramsTuple?: []; params?: {} };
        "leaderboard.ai_speedrun": { paramsTuple?: []; params?: {} };
        "game_history.index": { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
        "game_history.show": {
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
        };
        "game_history.replay": {
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
        };
        "deck_shares.show": { paramsTuple: [ParamValue]; params: { code: ParamValue } };
        "cards.index": { paramsTuple?: []; params?: {} };
        "auth.me": { paramsTuple?: []; params?: {} };
        "card_sets.index": { paramsTuple?: []; params?: {} };
        "collection.index": { paramsTuple?: []; params?: {} };
        "collection.duplicates_preview": { paramsTuple?: []; params?: {} };
        "collection.packs": { paramsTuple?: []; params?: {} };
        "daily_quests.index": { paramsTuple?: []; params?: {} };
        "friends.index": { paramsTuple?: []; params?: {} };
        "friends.search": { paramsTuple?: []; params?: {} };
        "friend_requests.index": { paramsTuple?: []; params?: {} };
        "friend_requests.sent": { paramsTuple?: []; params?: {} };
        "game_invites.index": { paramsTuple?: []; params?: {} };
        "game_invites.sent": { paramsTuple?: []; params?: {} };
        "events.index": { paramsTuple?: []; params?: {} };
        "decks.index": { paramsTuple?: []; params?: {} };
        "decks.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.index": { paramsTuple?: []; params?: {} };
        "games.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    HEAD: {
        "leaderboard.index": { paramsTuple?: []; params?: {} };
        "leaderboard.ai_speedrun": { paramsTuple?: []; params?: {} };
        "game_history.index": { paramsTuple: [ParamValue]; params: { userId: ParamValue } };
        "game_history.show": {
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
        };
        "game_history.replay": {
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
        };
        "deck_shares.show": { paramsTuple: [ParamValue]; params: { code: ParamValue } };
        "cards.index": { paramsTuple?: []; params?: {} };
        "auth.me": { paramsTuple?: []; params?: {} };
        "card_sets.index": { paramsTuple?: []; params?: {} };
        "collection.index": { paramsTuple?: []; params?: {} };
        "collection.duplicates_preview": { paramsTuple?: []; params?: {} };
        "collection.packs": { paramsTuple?: []; params?: {} };
        "daily_quests.index": { paramsTuple?: []; params?: {} };
        "friends.index": { paramsTuple?: []; params?: {} };
        "friends.search": { paramsTuple?: []; params?: {} };
        "friend_requests.index": { paramsTuple?: []; params?: {} };
        "friend_requests.sent": { paramsTuple?: []; params?: {} };
        "game_invites.index": { paramsTuple?: []; params?: {} };
        "game_invites.sent": { paramsTuple?: []; params?: {} };
        "events.index": { paramsTuple?: []; params?: {} };
        "decks.index": { paramsTuple?: []; params?: {} };
        "decks.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.index": { paramsTuple?: []; params?: {} };
        "games.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    POST: {
        "auth.login": { paramsTuple?: []; params?: {} };
        "auth.register": { paramsTuple?: []; params?: {} };
        "auth.logout": { paramsTuple?: []; params?: {} };
        "collection.sell_duplicates": { paramsTuple?: []; params?: {} };
        "collection.buy_card": { paramsTuple?: []; params?: {} };
        "collection.sell_card": { paramsTuple?: []; params?: {} };
        "collection.open_pack": { paramsTuple?: []; params?: {} };
        "rewards.buy_pack": { paramsTuple?: []; params?: {} };
        "rewards.claim_daily_pack": { paramsTuple?: []; params?: {} };
        "presence.heartbeat": { paramsTuple?: []; params?: {} };
        "daily_quests.claim": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "progression.claim": { paramsTuple: [ParamValue]; params: { level: ParamValue } };
        "friends.store": { paramsTuple?: []; params?: {} };
        "friend_requests.accept": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "game_invites.store": { paramsTuple?: []; params?: {} };
        "game_invites.accept": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "events.register": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "decks.select": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "deck_shares.store": { paramsTuple: [ParamValue]; params: { deckId: ParamValue } };
        "deck_shares.import": { paramsTuple?: []; params?: {} };
        "decks.store": { paramsTuple?: []; params?: {} };
        "games.training": { paramsTuple?: []; params?: {} };
        "games.search_heartbeat": { paramsTuple?: []; params?: {} };
        "games.store": { paramsTuple?: []; params?: {} };
    };
    PUT: {
        "decks.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    DELETE: {
        "friends.destroy": { paramsTuple: [ParamValue]; params: { friendUserId: ParamValue } };
        "friend_requests.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "game_invites.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "decks.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.cancel_search": { paramsTuple?: []; params?: {} };
        "games.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    PATCH: {
        "auth.update_avatar": { paramsTuple?: []; params?: {} };
        "decks.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
};
declare module "@adonisjs/core/types/http" {
    export interface RoutesList extends ScannedRoutes {}
}
