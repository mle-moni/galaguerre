/* eslint-disable prettier/prettier */
import type { routes } from "./index.ts";

export interface ApiDefinition {
    auth: {
        login: (typeof routes)["auth.login"];
        register: (typeof routes)["auth.register"];
        logout: (typeof routes)["auth.logout"];
        me: (typeof routes)["auth.me"];
    };
    leaderboard: {
        index: (typeof routes)["leaderboard.index"];
        aiSpeedrun: (typeof routes)["leaderboard.ai_speedrun"];
    };
    gameHistory: {
        index: (typeof routes)["game_history.index"];
        show: (typeof routes)["game_history.show"];
        replay: (typeof routes)["game_history.replay"];
    };
    deckShares: {
        show: (typeof routes)["deck_shares.show"];
        store: (typeof routes)["deck_shares.store"];
        import: (typeof routes)["deck_shares.import"];
    };
    cards: {
        index: (typeof routes)["cards.index"];
    };
    cardSets: {
        index: (typeof routes)["card_sets.index"];
    };
    collection: {
        index: (typeof routes)["collection.index"];
        duplicatesPreview: (typeof routes)["collection.duplicates_preview"];
        sellDuplicates: (typeof routes)["collection.sell_duplicates"];
        buyCard: (typeof routes)["collection.buy_card"];
        sellCard: (typeof routes)["collection.sell_card"];
        packs: (typeof routes)["collection.packs"];
        openPack: (typeof routes)["collection.open_pack"];
    };
    rewards: {
        buyPack: (typeof routes)["rewards.buy_pack"];
        claimDailyPack: (typeof routes)["rewards.claim_daily_pack"];
    };
    presence: {
        heartbeat: (typeof routes)["presence.heartbeat"];
    };
    dailyQuests: {
        index: (typeof routes)["daily_quests.index"];
        claim: (typeof routes)["daily_quests.claim"];
    };
    progression: {
        claim: (typeof routes)["progression.claim"];
    };
    friends: {
        index: (typeof routes)["friends.index"];
        search: (typeof routes)["friends.search"];
        store: (typeof routes)["friends.store"];
        destroy: (typeof routes)["friends.destroy"];
    };
    friendRequests: {
        index: (typeof routes)["friend_requests.index"];
        sent: (typeof routes)["friend_requests.sent"];
        accept: (typeof routes)["friend_requests.accept"];
        destroy: (typeof routes)["friend_requests.destroy"];
    };
    gameInvites: {
        index: (typeof routes)["game_invites.index"];
        sent: (typeof routes)["game_invites.sent"];
        store: (typeof routes)["game_invites.store"];
        accept: (typeof routes)["game_invites.accept"];
        destroy: (typeof routes)["game_invites.destroy"];
    };
    events: {
        index: (typeof routes)["events.index"];
        register: (typeof routes)["events.register"];
    };
    decks: {
        select: (typeof routes)["decks.select"];
        index: (typeof routes)["decks.index"];
        store: (typeof routes)["decks.store"];
        show: (typeof routes)["decks.show"];
        update: (typeof routes)["decks.update"];
        destroy: (typeof routes)["decks.destroy"];
    };
    games: {
        training: (typeof routes)["games.training"];
        cancelSearch: (typeof routes)["games.cancel_search"];
        searchHeartbeat: (typeof routes)["games.search_heartbeat"];
        index: (typeof routes)["games.index"];
        store: (typeof routes)["games.store"];
        show: (typeof routes)["games.show"];
        update: (typeof routes)["games.update"];
        destroy: (typeof routes)["games.destroy"];
    };
}
