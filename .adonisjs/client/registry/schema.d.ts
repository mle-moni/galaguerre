/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type {
    ExtractBody,
    ExtractErrorResponse,
    ExtractQuery,
    ExtractQueryForGet,
    ExtractResponse,
} from "@tuyau/core/types";
import type { InferInput, SimpleError } from "@vinejs/vine/types";

export type ParamValue = string | number | bigint | boolean;

export interface Registry {
    "auth.login": {
        methods: ["POST"];
        pattern: "/api/auth/login";
        types: {
            body: ExtractBody<
                InferInput<typeof import("#app/controllers/auth/adomin_login.js").loginSchema>
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<typeof import("#app/controllers/auth/adomin_login.js").loginSchema>
            >;
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/auth/auth_controller").default["login"]>>
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<import("#controllers/auth/auth_controller").default["login"]>
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "auth.register": {
        methods: ["POST"];
        pattern: "/api/auth/register";
        types: {
            body: ExtractBody<
                InferInput<typeof import("#app/controllers/auth/register.js").registerSchema>
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<typeof import("#app/controllers/auth/register.js").registerSchema>
            >;
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/auth/auth_controller").default["register"]>>
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/auth/auth_controller").default["register"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "auth.logout": {
        methods: ["POST"];
        pattern: "/api/auth/logout";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/auth/auth_controller").default["logout"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/auth/auth_controller").default["logout"]>>
            >;
        };
    };
    "leaderboard.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/leaderboard";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/leaderboard/leaderboard_controller").default["index"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/leaderboard/leaderboard_controller").default["index"]
                    >
                >
            >;
        };
    };
    "leaderboard.ai_speedrun": {
        methods: ["GET", "HEAD"];
        pattern: "/api/leaderboard/ai-speedrun";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/leaderboard/leaderboard_controller").default["aiSpeedrun"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/leaderboard/leaderboard_controller").default["aiSpeedrun"]
                    >
                >
            >;
        };
    };
    "game_history.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/game-history/:userId";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { userId: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_history/game_history_controller").default["index"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_history/game_history_controller").default["index"]
                    >
                >
            >;
        };
    };
    "game_history.show": {
        methods: ["GET", "HEAD"];
        pattern: "/api/game-history/:userId/:gameId";
        types: {
            body: {};
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_history/game_history_controller").default["show"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_history/game_history_controller").default["show"]
                    >
                >
            >;
        };
    };
    "game_history.replay": {
        methods: ["GET", "HEAD"];
        pattern: "/api/game-history/:userId/:gameId/replay";
        types: {
            body: {};
            paramsTuple: [ParamValue, ParamValue];
            params: { userId: ParamValue; gameId: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_history/game_history_controller").default["replay"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_history/game_history_controller").default["replay"]
                    >
                >
            >;
        };
    };
    "deck_shares.show": {
        methods: ["GET", "HEAD"];
        pattern: "/api/deck-shares/:code";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { code: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/deck_shares/deck_shares_controller").default["show"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/deck_shares/deck_shares_controller").default["show"]
                    >
                >
            >;
        };
    };
    "auth.me": {
        methods: ["GET", "HEAD"];
        pattern: "/api/auth/me";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/auth/auth_controller").default["me"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/auth/auth_controller").default["me"]>>
            >;
        };
    };
    "cards.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/cards";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: ExtractQueryForGet<
                InferInput<typeof import("#app/controllers/cards/list_cards.js").listCardsValidator>
            >;
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/cards/cards_controller").default["index"]>>
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<import("#controllers/cards/cards_controller").default["index"]>
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "card_sets.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/card-sets";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/card_sets/card_sets_controller").default["index"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/card_sets/card_sets_controller").default["index"]
                    >
                >
            >;
        };
    };
    "collection.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/collection";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["index"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["index"]
                    >
                >
            >;
        };
    };
    "collection.duplicates_preview": {
        methods: ["GET", "HEAD"];
        pattern: "/api/collection/duplicates-preview";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["duplicatesPreview"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["duplicatesPreview"]
                    >
                >
            >;
        };
    };
    "collection.sell_duplicates": {
        methods: ["POST"];
        pattern: "/api/collection/sell-duplicates";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["sellDuplicates"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["sellDuplicates"]
                    >
                >
            >;
        };
    };
    "collection.buy_card": {
        methods: ["POST"];
        pattern: "/api/collection/buy-card";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/collection/collection_validators.js").buyCardSchema
                >
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/collection/collection_validators.js").buyCardSchema
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["buyCard"]
                    >
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/collection/collection_controller").default["buyCard"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "collection.sell_card": {
        methods: ["POST"];
        pattern: "/api/collection/sell-card";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/collection/collection_validators.js").sellCardSchema
                >
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/collection/collection_validators.js").sellCardSchema
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["sellCard"]
                    >
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/collection/collection_controller").default["sellCard"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "collection.packs": {
        methods: ["GET", "HEAD"];
        pattern: "/api/packs";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["packs"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["packs"]
                    >
                >
            >;
        };
    };
    "collection.open_pack": {
        methods: ["POST"];
        pattern: "/api/packs/open";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["openPack"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/collection/collection_controller").default["openPack"]
                    >
                >
            >;
        };
    };
    "rewards.buy_pack": {
        methods: ["POST"];
        pattern: "/api/packs/buy";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/rewards/rewards_controller").default["buyPack"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/rewards/rewards_controller").default["buyPack"]>
                >
            >;
        };
    };
    "rewards.claim_daily_pack": {
        methods: ["POST"];
        pattern: "/api/rewards/daily-pack";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/rewards/rewards_controller").default["claimDailyPack"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/rewards/rewards_controller").default["claimDailyPack"]
                    >
                >
            >;
        };
    };
    "presence.heartbeat": {
        methods: ["POST"];
        pattern: "/api/presence/heartbeat";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/presence/presence_controller").default["heartbeat"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/presence/presence_controller").default["heartbeat"]
                    >
                >
            >;
        };
    };
    "daily_quests.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/daily-quests";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/daily_quests/daily_quests_controller").default["index"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/daily_quests/daily_quests_controller").default["index"]
                    >
                >
            >;
        };
    };
    "daily_quests.claim": {
        methods: ["POST"];
        pattern: "/api/daily-quests/:id/claim";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/daily_quests/daily_quests_controller").default["claim"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/daily_quests/daily_quests_controller").default["claim"]
                    >
                >
            >;
        };
    };
    "progression.claim": {
        methods: ["POST"];
        pattern: "/api/progression/levels/:level/claim";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { level: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/progression/progression_controller").default["claim"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/progression/progression_controller").default["claim"]
                    >
                >
            >;
        };
    };
    "friends.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/friends";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/friends/friends_controller").default["index"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/friends/friends_controller").default["index"]>
                >
            >;
        };
    };
    "friends.search": {
        methods: ["GET", "HEAD"];
        pattern: "/api/friends/search";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: ExtractQueryForGet<
                InferInput<
                    typeof import("#app/controllers/friends/friends_validators.js").searchFriendsValidator
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/friends/friends_controller").default["search"]>
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/friends/friends_controller").default["search"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "friends.store": {
        methods: ["POST"];
        pattern: "/api/friends";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/friends/friends_validators.js").addFriendValidator
                >
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/friends/friends_validators.js").addFriendValidator
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/friends/friends_controller").default["store"]>
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/friends/friends_controller").default["store"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "friends.destroy": {
        methods: ["DELETE"];
        pattern: "/api/friends/:friendUserId";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { friendUserId: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/friends/friends_controller").default["destroy"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/friends/friends_controller").default["destroy"]>
                >
            >;
        };
    };
    "friend_requests.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/friend-requests";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["index"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["index"]
                    >
                >
            >;
        };
    };
    "friend_requests.sent": {
        methods: ["GET", "HEAD"];
        pattern: "/api/friend-requests/sent";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["sent"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["sent"]
                    >
                >
            >;
        };
    };
    "friend_requests.accept": {
        methods: ["POST"];
        pattern: "/api/friend-requests/:id/accept";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["accept"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["accept"]
                    >
                >
            >;
        };
    };
    "friend_requests.destroy": {
        methods: ["DELETE"];
        pattern: "/api/friend-requests/:id";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["destroy"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/friends/friend_requests_controller").default["destroy"]
                    >
                >
            >;
        };
    };
    "game_invites.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/game-invites";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["index"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["index"]
                    >
                >
            >;
        };
    };
    "game_invites.sent": {
        methods: ["GET", "HEAD"];
        pattern: "/api/game-invites/sent";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["sent"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["sent"]
                    >
                >
            >;
        };
    };
    "game_invites.store": {
        methods: ["POST"];
        pattern: "/api/game-invites";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/game_invites/game_invite_validators.js").createGameInviteValidator
                >
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/game_invites/game_invite_validators.js").createGameInviteValidator
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["store"]
                    >
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/game_invites/game_invites_controller").default["store"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "game_invites.accept": {
        methods: ["POST"];
        pattern: "/api/game-invites/:id/accept";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["accept"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["accept"]
                    >
                >
            >;
        };
    };
    "game_invites.destroy": {
        methods: ["DELETE"];
        pattern: "/api/game-invites/:id";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["destroy"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/game_invites/game_invites_controller").default["destroy"]
                    >
                >
            >;
        };
    };
    "events.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/events";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/events/events_controller").default["index"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/events/events_controller").default["index"]>
                >
            >;
        };
    };
    "events.register": {
        methods: ["POST"];
        pattern: "/api/events/:id/register";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/events/events_controller").default["register"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/events/events_controller").default["register"]>
                >
            >;
        };
    };
    "decks.select": {
        methods: ["POST"];
        pattern: "/api/decks/:id/select";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["select"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["select"]>>
            >;
        };
    };
    "deck_shares.store": {
        methods: ["POST"];
        pattern: "/api/decks/:deckId/share";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { deckId: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/deck_shares/deck_shares_controller").default["store"]
                    >
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/deck_shares/deck_shares_controller").default["store"]
                    >
                >
            >;
        };
    };
    "deck_shares.import": {
        methods: ["POST"];
        pattern: "/api/decks/import";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/deck_shares/deck_share_validators.js").importDeckSchema
                >
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/deck_shares/deck_share_validators.js").importDeckSchema
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/deck_shares/deck_shares_controller").default["import"]
                    >
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/deck_shares/deck_shares_controller").default["import"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "decks.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/decks";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["index"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["index"]>>
            >;
        };
    };
    "decks.store": {
        methods: ["POST"];
        pattern: "/api/decks";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["store"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["store"]>>
            >;
        };
    };
    "decks.show": {
        methods: ["GET", "HEAD"];
        pattern: "/api/decks/:id";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["show"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["show"]>>
            >;
        };
    };
    "decks.update": {
        methods: ["PUT", "PATCH"];
        pattern: "/api/decks/:id";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/decks/deck_validators.js").updateDeckSchema
                >
            >;
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/decks/deck_validators.js").updateDeckSchema
                >
            >;
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/decks/decks_controller").default["update"]>>
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/decks/decks_controller").default["update"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "decks.destroy": {
        methods: ["DELETE"];
        pattern: "/api/decks/:id";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/decks/decks_controller").default["destroy"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/decks/decks_controller").default["destroy"]>
                >
            >;
        };
    };
    "games.training": {
        methods: ["POST"];
        pattern: "/api/games/training";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/games/games_controller").default["training"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/games/games_controller").default["training"]>
                >
            >;
        };
    };
    "games.cancel_search": {
        methods: ["DELETE"];
        pattern: "/api/games/search";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/games/cancel_game_search.js").cancelSchema
                >
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/games/cancel_game_search.js").cancelSchema
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/games/games_controller").default["cancelSearch"]
                    >
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/games/games_controller").default["cancelSearch"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "games.search_heartbeat": {
        methods: ["POST"];
        pattern: "/api/games/search/heartbeat";
        types: {
            body: ExtractBody<
                InferInput<
                    typeof import("#app/controllers/games/game_search_heartbeat.js").heartbeatSchema
                >
            >;
            paramsTuple: [];
            params: {};
            query: ExtractQuery<
                InferInput<
                    typeof import("#app/controllers/games/game_search_heartbeat.js").heartbeatSchema
                >
            >;
            response: ExtractResponse<
                Awaited<
                    ReturnType<
                        import("#controllers/games/games_controller").default["searchHeartbeat"]
                    >
                >
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<
                              import("#controllers/games/games_controller").default["searchHeartbeat"]
                          >
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "games.index": {
        methods: ["GET", "HEAD"];
        pattern: "/api/games";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/games/games_controller").default["index"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/games/games_controller").default["index"]>>
            >;
        };
    };
    "games.store": {
        methods: ["POST"];
        pattern: "/api/games";
        types: {
            body: {};
            paramsTuple: [];
            params: {};
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/games/games_controller").default["store"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/games/games_controller").default["store"]>>
            >;
        };
    };
    "games.show": {
        methods: ["GET", "HEAD"];
        pattern: "/api/games/:id";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: ExtractQueryForGet<
                InferInput<
                    typeof import("#app/controllers/games/show_game.js").showGameQueryValidator
                >
            >;
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/games/games_controller").default["show"]>>
            >;
            errorResponse:
                | ExtractErrorResponse<
                      Awaited<
                          ReturnType<import("#controllers/games/games_controller").default["show"]>
                      >
                  >
                | { status: 422; response: { errors: SimpleError[] } };
        };
    };
    "games.update": {
        methods: ["PUT", "PATCH"];
        pattern: "/api/games/:id";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<ReturnType<import("#controllers/games/games_controller").default["update"]>>
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<ReturnType<import("#controllers/games/games_controller").default["update"]>>
            >;
        };
    };
    "games.destroy": {
        methods: ["DELETE"];
        pattern: "/api/games/:id";
        types: {
            body: {};
            paramsTuple: [ParamValue];
            params: { id: ParamValue };
            query: {};
            response: ExtractResponse<
                Awaited<
                    ReturnType<import("#controllers/games/games_controller").default["destroy"]>
                >
            >;
            errorResponse: ExtractErrorResponse<
                Awaited<
                    ReturnType<import("#controllers/games/games_controller").default["destroy"]>
                >
            >;
        };
    };
}
