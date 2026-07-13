import AuthController from "#controllers/auth/auth_controller";
import { registerUser } from "#controllers/auth/register";
import { updateAvatar } from "#controllers/auth/update_avatar";
import { syncCards } from "#database/seed_helpers/sync_cards";
import Card from "#models/card";
import User from "#models/user";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";
import { test } from "@japa/runner";

const createHttpContext = (overrides: Partial<HttpContext> = {}) => {
    const response = {
        badRequest: (body: unknown) => body,
        unauthorized: (body: unknown) => body,
    };

    return {
        response,
        ...overrides,
    } as unknown as HttpContext;
};

const createAuthContext = (user: User, avatarCardId: number) =>
    ({
        auth: { user },
        request: {
            validateUsing: async () => ({ avatarCardId }),
        },
        response: {
            badRequest: (body: unknown) => body,
            unauthorized: (body: unknown) => body,
        },
    }) as unknown as HttpContext;

test.group("register avatar", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("creates a user with a random avatar when avatarCardId is omitted", async ({ assert }) => {
        await syncCards();

        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const ctx = createHttpContext();

        const result = await registerUser(ctx, {
            email: `avatar-random-${unique}@test.fr`,
            password: "test",
            pseudo: `AvatarRandom-${unique}`,
        });

        assert.property(result, "token");

        const user = await User.findByOrFail("email", `avatar-random-${unique}@test.fr`);
        const card = await Card.find(user.avatarCardId);

        assert.isNotNull(card);
    });

    test("creates a user with the requested avatarCardId", async ({ assert }) => {
        await syncCards();

        const card = await Card.query().firstOrFail();
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const ctx = createHttpContext();

        await registerUser(ctx, {
            email: `avatar-picked-${unique}@test.fr`,
            password: "test",
            pseudo: `AvatarPicked-${unique}`,
            avatarCardId: card.id,
        });

        const user = await User.findByOrFail("email", `avatar-picked-${unique}@test.fr`);

        assert.equal(user.avatarCardId, card.id);
    });

    test("rejects an invalid avatarCardId", async ({ assert }) => {
        await syncCards();

        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const ctx = createHttpContext();

        const result = await registerUser(ctx, {
            email: `avatar-invalid-${unique}@test.fr`,
            password: "test",
            pseudo: `AvatarInvalid-${unique}`,
            avatarCardId: 999_999,
        });

        assert.deepEqual(result, { error: "Cette carte n'existe pas" });
    });
});

test.group("update avatar", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("updates the authenticated user avatar", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: `avatar-update-${Date.now()}@test.fr`,
            password: "test",
            pseudo: "AvatarUpdate",
        });

        const nextCard = await Card.query().whereNot("id", user.avatarCardId).firstOrFail();

        const ctx = createAuthContext(user, nextCard.id);

        const result = await updateAvatar(ctx);

        assert.deepEqual(result, { avatarCardId: nextCard.id });

        await user.refresh();
        assert.equal(user.avatarCardId, nextCard.id);
    });

    test("rejects an invalid avatarCardId", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: `avatar-update-invalid-${Date.now()}@test.fr`,
            password: "test",
            pseudo: "AvatarUpdateInvalid",
        });

        const ctx = createAuthContext(user, 999_999);

        const result = await updateAvatar(ctx);

        assert.deepEqual(result, { error: "Cette carte n'existe pas" });
    });

    test("auth controller exposes updateAvatar", async ({ assert }) => {
        const controller = new AuthController();

        assert.isFunction(controller.updateAvatar);
    });
});
