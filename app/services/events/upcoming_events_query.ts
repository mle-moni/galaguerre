import Event from "#models/event";
import type { ModelQueryBuilderContract } from "@adonisjs/lucid/types/model";
import { DateTime } from "luxon";

export const UPCOMING_EVENT_WINDOW_DAYS = 30;

export const getUpcomingEventsWindow = (now: DateTime = DateTime.now()) => {
    const windowStart = now.startOf("day");
    const windowEnd = windowStart.plus({ days: UPCOMING_EVENT_WINDOW_DAYS }).endOf("day");

    return { windowStart, windowEnd };
};

export const upcomingEventsQuery = (
    now: DateTime = DateTime.now(),
): ModelQueryBuilderContract<typeof Event, Event> => {
    const { windowStart, windowEnd } = getUpcomingEventsWindow(now);

    return Event.query()
        .where("startsAt", ">=", windowStart.toSQL()!)
        .where("startsAt", "<=", windowEnd.toSQL()!)
        .orderBy("startsAt", "asc");
};

export const isEventInUpcomingWindow = (startsAt: DateTime, now: DateTime = DateTime.now()) => {
    const { windowStart, windowEnd } = getUpcomingEventsWindow(now);

    return startsAt >= windowStart && startsAt <= windowEnd;
};
