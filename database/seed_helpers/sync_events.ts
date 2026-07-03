import { GALAGUERRE_EVENTS } from "#database/seed_data/events/galaguerre_events";
import type { EventSeedEntry } from "#database/seed_data/events/define_event";
import Event from "#models/event";
import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";

const buildSyncedEventInsert = (entry: EventSeedEntry) => ({
    title: entry.title,
    shortDescription: entry.shortDescription,
    longDescription: entry.longDescription,
    imageUrl: entry.imageUrl,
    startsAt: DateTime.fromISO(entry.startsAt),
});

export const syncEvents = async () => {
    logger.info("events sync starting...");

    const seededEventIds = GALAGUERRE_EVENTS.map((entry) => entry.id);

    await db.transaction(async (trx) => {
        for (const entry of GALAGUERRE_EVENTS) {
            await Event.updateOrCreate({ id: entry.id }, buildSyncedEventInsert(entry), {
                client: trx,
            });
        }

        await Event.query({ client: trx }).whereNotIn("id", seededEventIds).delete();
    });

    await db.rawQuery(`
        SELECT setval(
            pg_get_serial_sequence('events', 'id'),
            COALESCE((SELECT MAX(id) FROM events), 0) + 1,
            false
        )
    `);

    logger.info("events sync completed");
};
