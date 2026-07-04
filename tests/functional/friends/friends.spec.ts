import FriendsController from "#controllers/friends/friends_controller";
import FriendRequestsController from "#controllers/friends/friend_requests_controller";
import { showGame } from "#controllers/games/show_game";
import type { AddFriendResponse, ApiFriend } from "#api_types/friend.types";
import type { ApiGame } from "#api_types/game.types";
import FriendRequest from "#models/friend_request";
import Friendship from "#models/friendship";
import User from "#models/user";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";
import { test } from "@japa/runner";
import { createOutsiderUser, createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";

const createUser = async (suffix: string, pseudo: string) =>
    User.create({
        email: `friends-${suffix}@test.fr`,
        password: "test",
        pseudo,
    });

const createContext = (
    user: User,
    {
        body = {},
        input = {},
        params = {},
    }: {
        body?: Record<string, unknown>;
        input?: Record<string, unknown>;
        params?: Record<string, unknown>;
    } = {},
) => {
    let badRequestBody: unknown;
    let forbiddenBody: unknown;
    let notFoundBody: unknown;

    const ctx = {
        auth: { user },
        request: {
            input: (key: string, defaultValue?: unknown) => input[key] ?? defaultValue,
            validateUsing: async () => ({ ...input, ...body }),
        },
        params,
        response: {
            badRequest: (payload: unknown) => {
                badRequestBody = payload;
                return payload;
            },
            forbidden: (payload: unknown) => {
                forbiddenBody = payload;
                return payload;
            },
            notFound: (payload: unknown) => {
                notFoundBody = payload;
                return payload;
            },
        },
    } as unknown as HttpContext;

    return {
        ctx,
        getBadRequestBody: () => badRequestBody,
        getForbiddenBody: () => forbiddenBody,
        getNotFoundBody: () => notFoundBody,
    };
};

test.group("friends", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("searches users by pseudo and marks mutual friends", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-${unique}`, `Current-${unique}`);
        const friend = await createUser(`friend-${unique}`, `Buddy-${unique}`);
        const other = await createUser(`other-${unique}`, `BuddyOther-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: friend.id });
        await Friendship.create({ userId: friend.id, friendId: currentUser.id });

        const controller = new FriendsController();
        const { ctx } = createContext(currentUser, { input: { q: `Buddy-${unique}` } });
        const results = await controller.search(ctx);

        assert.isTrue(results.some((entry) => entry.userId === friend.id && entry.isFriend));
        assert.isFalse(results.some((entry) => entry.userId === currentUser.id));
        assert.isFalse(results.some((entry) => entry.userId === other.id));
    });

    test("sending a friend request does not create an immediate friendship", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-add-${unique}`, `CurrentAdd-${unique}`);
        const friend = await createUser(`friend-add-${unique}`, `FriendAdd-${unique}`);
        const controller = new FriendsController();
        const { ctx } = createContext(currentUser, { body: { friendUserId: friend.id } });

        const response = (await controller.store(ctx)) as AddFriendResponse;
        await controller.store(ctx);

        const friendshipRows = await Friendship.query()
            .where("userId", currentUser.id)
            .where("friendId", friend.id);
        const requestRows = await FriendRequest.query()
            .where("fromUserId", currentUser.id)
            .where("toUserId", friend.id);
        const friends = await controller.index(createContext(currentUser).ctx);

        assert.equal(response.status, "sent");
        assert.equal(response.requestId, requestRows[0]!.id);
        assert.equal(friendshipRows.length, 0);
        assert.equal(requestRows.length, 1);
        assert.equal(friends.length, 0);
    });

    test("includes current game id for mutual friends in an active game", async ({ assert }) => {
        const { game, playerOne } = await createTestGame(createGameData());
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`spectator-${unique}`, `Spectator-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: playerOne.id });
        await Friendship.create({ userId: playerOne.id, friendId: currentUser.id });

        const friends = await new FriendsController().index(createContext(currentUser).ctx);

        assert.equal(friends[0]!.userId, playerOne.id);
        assert.equal(friends[0]!.currentGameId, game.id);
    });

    test("does not expose current game id without mutual friendship", async ({ assert }) => {
        const { game, playerOne } = await createTestGame(createGameData());
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`spectator-${unique}`, `Spectator-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: playerOne.id });

        const friends = await new FriendsController().index(createContext(currentUser).ctx);

        assert.equal(friends.length, 0);
        assert.equal(game.id > 0, true);
    });

    test("allows watching a mutual friend game from their point of view", async ({ assert }) => {
        const friendCard = createMinionCard({
            cardId: 999,
            label: "Secret minion",
            uuid: "secret-minion",
        });
        const opponentCard = createMinionCard({
            cardId: 1000,
            label: "Opponent minion",
            uuid: "opponent-minion",
        });
        const { game, playerOne } = await createTestGame(
            createGameData({
                playerOne: { hand: [friendCard] },
                playerTwo: { hand: [opponentCard] },
            }),
        );
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`watcher-${unique}`, `Watcher-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: playerOne.id });
        await Friendship.create({ userId: playerOne.id, friendId: currentUser.id });

        const result = (await showGame(
            createContext(currentUser, {
                params: { id: game.id },
                input: { asUserId: playerOne.id },
            }).ctx,
            playerOne.id,
        )) as ApiGame;

        assert.equal(result.id, game.id);
        assert.equal(result.data.playerOne.hand[0]!.label, "Secret minion");
        assert.equal(result.data.playerTwo.hand[0]!.label, "dummy card");
    });

    test("rejects watching with one-way friendship only", async ({ assert }) => {
        const { game, playerOne } = await createTestGame(createGameData());
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`watcher-${unique}`, `Watcher-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: playerOne.id });

        const { ctx, getForbiddenBody } = createContext(currentUser, {
            params: { id: game.id },
            input: { asUserId: playerOne.id },
        });

        await showGame(ctx, playerOne.id);

        assert.deepEqual(getForbiddenBody(), {
            error: "Vous ne pouvez pas regarder cette partie",
        });
    });

    test("rejects watching from another player point of view", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(createGameData());
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`watcher-${unique}`, `Watcher-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: playerOne.id });
        await Friendship.create({ userId: playerOne.id, friendId: currentUser.id });

        const { ctx, getForbiddenBody } = createContext(currentUser, {
            params: { id: game.id },
            input: { asUserId: playerTwo.id },
        });

        await showGame(ctx, playerTwo.id);

        assert.deepEqual(getForbiddenBody(), {
            error: "Vous ne pouvez pas regarder cette partie",
        });
    });

    test("rejects watching games when no participant is a friend", async ({ assert }) => {
        const { game } = await createTestGame(createGameData());
        const outsider = await createOutsiderUser();
        const { ctx, getBadRequestBody } = createContext(outsider, { params: { id: game.id } });

        await showGame(ctx, undefined);

        assert.deepEqual(getBadRequestBody(), {
            error: "Joueur à observer requis",
        });
    });

    test("rejects adding yourself", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`self-${unique}`, `Self-${unique}`);
        const controller = new FriendsController();
        const { ctx, getBadRequestBody } = createContext(currentUser, {
            body: { friendUserId: currentUser.id },
        });

        await controller.store(ctx);

        assert.deepEqual(getBadRequestBody(), {
            error: "Impossible de vous ajouter vous-même",
        });
    });

    test("removes a mutual friendship in both directions", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-remove-${unique}`, `CurrentRemove-${unique}`);
        const friend = await createUser(`friend-remove-${unique}`, `FriendRemove-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: friend.id });
        await Friendship.create({ userId: friend.id, friendId: currentUser.id });

        const controller = new FriendsController();
        await controller.destroy(
            createContext(currentUser, { params: { friendUserId: String(friend.id) } }).ctx,
        );

        const outgoingRows = await Friendship.query()
            .where("userId", currentUser.id)
            .where("friendId", friend.id);
        const incomingRows = await Friendship.query()
            .where("userId", friend.id)
            .where("friendId", currentUser.id);

        assert.equal(outgoingRows.length, 0);
        assert.equal(incomingRows.length, 0);
    });
});

test.group("friend requests", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("lists incoming friend requests for the recipient", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sender = await createUser(`sender-${unique}`, `Sender-${unique}`);
        const recipient = await createUser(`recipient-${unique}`, `Recipient-${unique}`);

        await FriendRequest.create({ fromUserId: sender.id, toUserId: recipient.id });

        const controller = new FriendRequestsController();
        const requests = await controller.index(createContext(recipient).ctx);

        assert.equal(requests.length, 1);
        assert.equal(requests[0]!.fromUserId, sender.id);
        assert.equal(requests[0]!.fromPseudo, sender.pseudo);
    });

    test("accepting a friend request creates mutual friendship for both users", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sender = await createUser(`sender-accept-${unique}`, `SenderAccept-${unique}`);
        const recipient = await createUser(
            `recipient-accept-${unique}`,
            `RecipientAccept-${unique}`,
        );
        const friendRequest = await FriendRequest.create({
            fromUserId: sender.id,
            toUserId: recipient.id,
        });

        const requestsController = new FriendRequestsController();
        const friendsController = new FriendsController();
        const acceptedFriend = (await requestsController.accept(
            createContext(recipient, { params: { id: String(friendRequest.id) } }).ctx,
        )) as ApiFriend;

        const senderFriends = await friendsController.index(createContext(sender).ctx);
        const recipientFriends = await friendsController.index(createContext(recipient).ctx);
        const remainingRequests = await FriendRequest.query().where("id", friendRequest.id);

        assert.equal(acceptedFriend.userId, sender.id);
        assert.equal(senderFriends.length, 1);
        assert.equal(recipientFriends.length, 1);
        assert.equal(senderFriends[0]!.userId, recipient.id);
        assert.equal(recipientFriends[0]!.userId, sender.id);
        assert.equal(remainingRequests.length, 0);
    });

    test("declining a friend request removes it without creating friendship", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sender = await createUser(`sender-decline-${unique}`, `SenderDecline-${unique}`);
        const recipient = await createUser(
            `recipient-decline-${unique}`,
            `RecipientDecline-${unique}`,
        );
        const friendRequest = await FriendRequest.create({
            fromUserId: sender.id,
            toUserId: recipient.id,
        });

        const controller = new FriendRequestsController();
        await controller.destroy(
            createContext(recipient, { params: { id: String(friendRequest.id) } }).ctx,
        );

        const friendships = await Friendship.query();
        const requests = await FriendRequest.query().where("id", friendRequest.id);

        assert.equal(friendships.length, 0);
        assert.equal(requests.length, 0);
    });

    test("sender can cancel an outgoing friend request", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sender = await createUser(`sender-cancel-${unique}`, `SenderCancel-${unique}`);
        const recipient = await createUser(
            `recipient-cancel-${unique}`,
            `RecipientCancel-${unique}`,
        );
        const friendRequest = await FriendRequest.create({
            fromUserId: sender.id,
            toUserId: recipient.id,
        });

        const controller = new FriendRequestsController();
        await controller.destroy(
            createContext(sender, { params: { id: String(friendRequest.id) } }).ctx,
        );

        const requests = await FriendRequest.query().where("id", friendRequest.id);

        assert.equal(requests.length, 0);
    });

    test("auto accepts when sending a request to someone who already requested you", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const userA = await createUser(`user-a-${unique}`, `UserA-${unique}`);
        const userB = await createUser(`user-b-${unique}`, `UserB-${unique}`);

        await FriendRequest.create({ fromUserId: userA.id, toUserId: userB.id });

        const friendsController = new FriendsController();
        const response = (await friendsController.store(
            createContext(userB, { body: { friendUserId: userA.id } }).ctx,
        )) as AddFriendResponse;
        const userAFriends = await friendsController.index(createContext(userA).ctx);
        const userBFriends = await friendsController.index(createContext(userB).ctx);
        const remainingRequests = await FriendRequest.query();

        assert.equal(response.status, "accepted");
        assert.isNotNull(response.friend);
        assert.equal(userAFriends.length, 1);
        assert.equal(userBFriends.length, 1);
        assert.equal(remainingRequests.length, 0);
    });
});
