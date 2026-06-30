import { GALADRIM_CARD_SET_NAME } from "#database/seed_data/card_set_names";
import { buildSyncedCardInsert } from "#database/seed_helpers/build_synced_card_insert";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";
import Card from "#models/card";
import CardSet from "#models/card_set";
import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

export const syncCards = async () => {
    logger.info("cards sync starting...");

    await db.transaction(async (trx) => {
        const cardSet = await CardSet.updateOrCreate(
            { name: GALADRIM_CARD_SET_NAME },
            { name: GALADRIM_CARD_SET_NAME, isActive: true },
            { client: trx },
        );

        for (const entry of GALADRIM_CARDS) {
            await Card.updateOrCreate({ id: entry.id }, buildSyncedCardInsert(entry, cardSet.id), {
                client: trx,
            });
        }
    });

    await db.rawQuery(`
        SELECT setval(
            pg_get_serial_sequence('cards', 'id'),
            COALESCE((SELECT MAX(id) FROM cards), 0) + 1,
            false
        )
    `);

    logger.info("cards sync completed");
};
