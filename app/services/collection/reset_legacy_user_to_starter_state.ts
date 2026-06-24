import Deck from "#models/deck";
import db from "@adonisjs/lucid/services/db";
import { grantCardPacksForUser } from "#services/collection/grant_card_packs_for_user";
import { createStarterDeckForUser } from "#services/decks/create_starter_deck_for_user";

export const LEGACY_USER_COMPENSATION_PACK_COUNT = 10;

export const findLegacyUserIdsWithoutCollection = async (): Promise<number[]> => {
    const rows = await db
        .from("users")
        .select("users.id")
        .whereNotExists((query) => {
            query.from("user_cards").whereRaw("user_cards.user_id = users.id");
        });

    return rows.map((row) => row.id as number);
};

export const resetLegacyUserToStarterState = async (userId: number): Promise<void> => {
    await db.transaction(async (trx) => {
        await Deck.query({ client: trx }).where("userId", userId).delete();
        await createStarterDeckForUser(userId, trx);
        await grantCardPacksForUser(userId, LEGACY_USER_COMPENSATION_PACK_COUNT, trx);
    });
};
