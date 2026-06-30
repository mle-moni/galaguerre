import FriendsController from "#controllers/friends/friends_controller";
import { showGame } from "#controllers/games/show_game";
import type { ApiFriend } from "#api_types/friend.types";
import type { ApiGame } from "#api_types/game.types";
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
            validateUsing: async () => body,
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
            currentGameId: null,
        });
    });

    test("includes current game id for friends in an active game", async ({ assert }) => {
        const { game, playerOne } = await createTestGame(createGameData());
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`spectator-${unique}`, `Spectator-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: playerOne.id });

        const friends = await new FriendsController().index(createContext(currentUser).ctx);

        assert.equal(friends[0]!.userId, playerOne.id);
        assert.equal(friends[0]!.currentGameId, game.id);
    });

    test("allows watching a friend game without revealing hands", async ({ assert }) => {
        const secretCard = createMinionCard({
            cardId: 999,
            label: "Secret minion",
            uuid: "secret-minion",
        });
        const { game, playerOne } = await createTestGame(
            createGameData({ playerOne: { hand: [secretCard] } }),
        );
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const currentUser = await createUser(`watcher-${unique}`, `Watcher-${unique}`);

        await Friendship.create({ userId: currentUser.id, friendId: playerOne.id });

        const result = (await showGame(
            createContext(currentUser, { params: { id: game.id } }).ctx,
        )) as ApiGame;

        assert.equal(result.id, game.id);
        assert.equal(result.data.playerOne.hand.length, 1);
        assert.equal(result.data.playerOne.hand[0]!.label, "dummy card");
    });

    test("rejects watching games when no participant is a friend", async ({ assert }) => {
        const { game } = await createTestGame(createGameData());
        const outsider = await createOutsiderUser();
        const { ctx, getForbiddenBody } = createContext(outsider, { params: { id: game.id } });

        await showGame(ctx);

        assert.deepEqual(getForbiddenBody(), {
            error: "Vous ne pouvez pas regarder cette partie",
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
