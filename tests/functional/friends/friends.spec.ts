import FriendsController from "#controllers/friends/friends_controller";
import type { ApiFriend } from "#api_types/friend.types";
import Friendship from "#models/friendship";
import User from "#models/user";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";
import { test } from "@japa/runner";

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
    let notFoundBody: unknown;

    const ctx = {
        auth: { user },
        request: {
            input: (key: string, defaultValue?: unknown) => input[key] ?? defaultValue,
            validateUsing: async () => body,
        },
        params,
        response: {
            badRequest: (payload: unknown) => {
                badRequestBody = payload;
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
        getNotFoundBody: () => notFoundBody,
    };
};

test.group("friends", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("searches users by pseudo and marks existing friends", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-${unique}`, `Current-${unique}`);
        const friend = await createUser(`friend-${unique}`, `Buddy-${unique}`);
        const other = await createUser(`other-${unique}`, `BuddyOther-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: friend.id });

        const controller = new FriendsController();
        const { ctx } = createContext(currentUser, { input: { q: `Buddy-${unique}` } });
        const results = await controller.search(ctx);

        assert.isTrue(results.some((entry) => entry.userId === friend.id && entry.isFriend));
        assert.isFalse(results.some((entry) => entry.userId === currentUser.id));
        assert.isFalse(results.some((entry) => entry.userId === other.id));
    });

    test("adds a friend once and returns it in the friend list", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-add-${unique}`, `CurrentAdd-${unique}`);
        const friend = await createUser(`friend-add-${unique}`, `FriendAdd-${unique}`);
        const controller = new FriendsController();
        const { ctx } = createContext(currentUser, { body: { friendUserId: friend.id } });

        const addedFriend = (await controller.store(ctx)) as ApiFriend;
        await controller.store(ctx);

        const rows = await Friendship.query()
            .where("userId", currentUser.id)
            .where("friendId", friend.id);
        const friends = await controller.index(createContext(currentUser).ctx);

        assert.equal(rows.length, 1);
        assert.equal(addedFriend.userId, friend.id);
        assert.deepInclude(friends, {
            userId: friend.id,
            pseudo: friend.pseudo,
            elo: friend.elo,
            wins: friend.wins,
            losses: friend.losses,
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

    test("removes a friend", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-remove-${unique}`, `CurrentRemove-${unique}`);
        const friend = await createUser(`friend-remove-${unique}`, `FriendRemove-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: friend.id });

        const controller = new FriendsController();
        await controller.destroy(
            createContext(currentUser, { params: { friendUserId: String(friend.id) } }).ctx,
        );

        const rows = await Friendship.query()
            .where("userId", currentUser.id)
            .where("friendId", friend.id);

        assert.equal(rows.length, 0);
    });
});
