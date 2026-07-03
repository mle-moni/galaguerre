import EventsController from "#controllers/events/events_controller";
import type { ApiEvent } from "#api_types/event.types";
import Event from "#models/event";
import EventRegistration from "#models/event_registration";
import User from "#models/user";
import { UPCOMING_EVENT_WINDOW_DAYS } from "#services/events/upcoming_events_query";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

const createUser = async (suffix: string) =>
    User.create({
        email: `events-${suffix}@test.fr`,
        password: "test",
        pseudo: `EventUser-${suffix}`,
    });

const createEvent = async (
    suffix: string,
    startsAt: DateTime,
    overrides: Partial<{
        title: string;
        shortDescription: string;
        longDescription: string;
        imageUrl: string;
    }> = {},
) =>
    Event.create({
        title: overrides.title ?? `Event-${suffix}`,
        shortDescription: overrides.shortDescription ?? "Description courte",
        longDescription: overrides.longDescription ?? "Description longue",
        imageUrl: overrides.imageUrl ?? "/home/event-banner.webp",
        startsAt,
    });

const createContext = (user: User, params: Record<string, unknown> = {}) => {
    let notFoundBody: unknown;
    let badRequestBody: unknown;

    const ctx = {
        auth: { user },
        params,
        response: {
            notFound: (payload: unknown) => {
                notFoundBody = payload;
                return payload;
            },
            badRequest: (payload: unknown) => {
                badRequestBody = payload;
                return payload;
            },
        },
    } as unknown as HttpContext;

    return {
        ctx,
        getNotFoundBody: () => notFoundBody,
        getBadRequestBody: () => badRequestBody,
    };
};

test.group("events", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("lists only upcoming events within the 30-day window", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await createUser(unique);
        const today = DateTime.now().startOf("day");

        await createEvent(`${unique}-in-window`, today.plus({ days: 2 }));
        await createEvent(
            `${unique}-out-window`,
            today.plus({ days: UPCOMING_EVENT_WINDOW_DAYS + 1 }),
        );

        const controller = new EventsController();
        const { ctx } = createContext(user);
        const events = await controller.index(ctx);

        assert.isTrue(events.some((event) => event.title === `Event-${unique}-in-window`));
        assert.isFalse(events.some((event) => event.title === `Event-${unique}-out-window`));
        assert.isTrue(events.every((event) => event.isRegistered === false));
        assert.isTrue(events.every((event) => event.registrationCount === 0));
    });

    test("registers a user for an upcoming event", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await createUser(unique);
        const event = await createEvent(unique, DateTime.now().startOf("day").plus({ days: 3 }));

        const controller = new EventsController();
        const { ctx } = createContext(user, { id: String(event.id) });
        const registered = (await controller.register(ctx)) as ApiEvent;

        assert.equal(registered.id, event.id);
        assert.isTrue(registered.isRegistered);
        assert.equal(registered.registrationCount, 1);

        const registration = await EventRegistration.query()
            .where("userId", user.id)
            .where("eventId", event.id)
            .first();

        assert.isNotNull(registration);
    });

    test("registration is idempotent", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await createUser(unique);
        const event = await createEvent(unique, DateTime.now().startOf("day").plus({ days: 5 }));

        const controller = new EventsController();
        const { ctx } = createContext(user, { id: String(event.id) });

        await controller.register(ctx);
        const secondRegistration = (await controller.register(ctx)) as ApiEvent;

        assert.isTrue(secondRegistration.isRegistered);
        assert.equal(secondRegistration.registrationCount, 1);

        const registrations = await EventRegistration.query()
            .where("userId", user.id)
            .where("eventId", event.id);

        assert.lengthOf(registrations, 1);
    });

    test("returns registration count in event list", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await createUser(unique);
        const otherUser = await createUser(`${unique}-other`);
        const event = await createEvent(unique, DateTime.now().startOf("day").plus({ days: 4 }));

        await EventRegistration.create({ userId: user.id, eventId: event.id });
        await EventRegistration.create({ userId: otherUser.id, eventId: event.id });

        const controller = new EventsController();
        const { ctx } = createContext(user);
        const events = await controller.index(ctx);
        const listedEvent = events.find((entry) => entry.id === event.id);

        assert.isDefined(listedEvent);
        assert.equal(listedEvent!.registrationCount, 2);
        assert.isTrue(listedEvent!.isRegistered);
    });

    test("returns 404 when registering for an event outside the window", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await createUser(unique);
        const event = await createEvent(
            unique,
            DateTime.now()
                .startOf("day")
                .plus({ days: UPCOMING_EVENT_WINDOW_DAYS + 2 }),
        );

        const controller = new EventsController();
        const { ctx, getNotFoundBody } = createContext(user, { id: String(event.id) });

        await controller.register(ctx);

        assert.deepEqual(getNotFoundBody(), { error: "Événement introuvable" });
    });

    test("returns 404 when registering for a missing event", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await createUser(unique);

        const controller = new EventsController();
        const { ctx, getNotFoundBody } = createContext(user, { id: "999999" });

        await controller.register(ctx);

        assert.deepEqual(getNotFoundBody(), { error: "Événement introuvable" });
    });
});
