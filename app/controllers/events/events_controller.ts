import type { ApiEvent } from "#api_types/event.types";
import Event from "#models/event";
import EventRegistration from "#models/event_registration";
import {
    isEventInUpcomingWindow,
    upcomingEventsQuery,
} from "#services/events/upcoming_events_query";
import type { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";

type SerializeEventOptions = {
    isRegistered: boolean;
    registrationCount: number;
};

const serializeEvent = (event: Event, options: SerializeEventOptions): ApiEvent => ({
    id: event.id,
    title: event.title,
    shortDescription: event.shortDescription,
    longDescription: event.longDescription,
    imageUrl: event.imageUrl,
    startsAt: event.startsAt.toISO()!,
    isRegistered: options.isRegistered,
    registrationCount: options.registrationCount,
});

const getRegisteredEventIds = async (userId: number, eventIds: number[]) => {
    if (eventIds.length === 0) return new Set<number>();

    const registrations = await EventRegistration.query()
        .where("userId", userId)
        .whereIn("eventId", eventIds);

    return new Set(registrations.map((registration) => registration.eventId));
};

const getRegistrationCountsByEventId = async (eventIds: number[]) => {
    if (eventIds.length === 0) return new Map<number, number>();

    const rows = await db
        .from("event_registrations")
        .whereIn("event_id", eventIds)
        .groupBy("event_id")
        .select("event_id")
        .count("* as total");

    return new Map(rows.map((row) => [Number(row.event_id), Number(row.total)]));
};

const getRegistrationCount = async (eventId: number) => {
    const result = await EventRegistration.query().where("eventId", eventId).count("* as total");
    return Number(result[0].$extras.total);
};

export default class EventsController {
    async index({ auth }: HttpContext): Promise<ApiEvent[]> {
        const events = await upcomingEventsQuery();
        const eventIds = events.map((event) => event.id);
        const [registeredEventIds, registrationCountsByEventId] = await Promise.all([
            getRegisteredEventIds(auth.user!.id, eventIds),
            getRegistrationCountsByEventId(eventIds),
        ]);

        return events.map((event) =>
            serializeEvent(event, {
                isRegistered: registeredEventIds.has(event.id),
                registrationCount: registrationCountsByEventId.get(event.id) ?? 0,
            }),
        );
    }

    async register({ auth, params, response }: HttpContext) {
        const eventId = Number(params.id);

        if (!Number.isFinite(eventId) || eventId <= 0) {
            return response.badRequest({ error: "Événement invalide" });
        }

        const event = await Event.find(eventId);

        if (!event || !isEventInUpcomingWindow(event.startsAt)) {
            return response.notFound({ error: "Événement introuvable" });
        }

        await EventRegistration.firstOrCreate(
            { userId: auth.user!.id, eventId: event.id },
            { userId: auth.user!.id, eventId: event.id },
        );

        return serializeEvent(event, {
            isRegistered: true,
            registrationCount: await getRegistrationCount(event.id),
        });
    }
}
