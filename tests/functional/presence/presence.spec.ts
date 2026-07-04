import PresenceController from "#controllers/presence/presence_controller";
import FriendsController from "#controllers/friends/friends_controller";
import Friendship from "#models/friendship";
import User from "#models/user";
import { touchPresence } from "#services/presence/presence";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

const createUser = async (suffix: string, pseudo: string) =>
    User.create({
        email: `presence-${suffix}@test.fr`,
        password: "test",
        pseudo,
    });

const createContext = (user: User) => {
    const ctx = {
        auth: { user },
    } as unknown as HttpContext;

    return { ctx };
};

test.group("presence heartbeat", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("heartbeat updates lastSeenAt for the authenticated user", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await createUser(unique, `Presence-${unique}`);
        const controller = new PresenceController();
        const { ctx } = createContext(user);

        const response = await controller.heartbeat(ctx);
        const refreshedUser = await User.findOrFail(user.id);

        assert.deepEqual(response, { ok: true });
        assert.isNotNull(refreshedUser.lastSeenAt);
    });
});

test.group("friends presence", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("marks mutual friends as online when their heartbeat is recent", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-${unique}`, `Current-${unique}`);
        const friend = await createUser(`friend-${unique}`, `Buddy-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: friend.id });
        await Friendship.create({ userId: friend.id, friendId: currentUser.id });
        await touchPresence(friend.id);

        const friends = await new FriendsController().index(createContext(currentUser).ctx);
        const serializedFriend = friends.find((entry) => entry.userId === friend.id);

        assert.isDefined(serializedFriend);
        assert.isTrue(serializedFriend!.isOnline);
        assert.isNotNull(serializedFriend!.lastSeenAt);
    });

    test("marks mutual friends as offline when their heartbeat expired", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`current-offline-${unique}`, `Current-${unique}`);
        const friend = await createUser(`friend-offline-${unique}`, `Buddy-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: friend.id });
        await Friendship.create({ userId: friend.id, friendId: currentUser.id });
        await User.query()
            .where("id", friend.id)
            .update({ lastSeenAt: DateTime.now().minus({ minutes: 5 }) });

        const friends = await new FriendsController().index(createContext(currentUser).ctx);
        const serializedFriend = friends.find((entry) => entry.userId === friend.id);

        assert.isDefined(serializedFriend);
        assert.isFalse(serializedFriend!.isOnline);
        assert.isNotNull(serializedFriend!.lastSeenAt);
    });
});
