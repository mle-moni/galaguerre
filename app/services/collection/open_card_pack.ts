import type { ApiOpenedPackCard } from "#api_types/collection.types";
import { PACK_SIZE } from "#api_types/collection.types";
import { serializeCatalogCard } from "#galaguerre/serialization/serialize_catalog_card";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";
import { drawPackCardsWithoutReplacement } from "./draw_weighted_pack_cards.js";
import { grantPackCardCopyForUser } from "./grant_starter_collection_for_user.js";
import { updateDailyQuestProgressForPackOpen } from "#services/daily_quests/update_daily_quest_progress";

export class NoUnopenedPackError extends Error {
    constructor() {
        super("Aucun paquet à ouvrir");
        this.name = "NoUnopenedPackError";
    }
}

export class NotEnoughCollectibleCardsError extends Error {
    constructor() {
        super("Pas assez de cartes collectibles pour ouvrir un paquet");
        this.name = "NotEnoughCollectibleCardsError";
    }
}

export const openCardPack = async (userId: number): Promise<ApiOpenedPackCard[]> => {
    const openedCards = await db.transaction(async (trx) => {
        const pack = await CardPack.query({ client: trx })
            .where("userId", userId)
            .whereNull("openedAt")
            .orderBy("createdAt", "asc")
            .forUpdate()
            .first();

        if (!pack) {
            throw new NoUnopenedPackError();
        }

        const collectibleCards = await Card.query({ client: trx }).where("isCollectible", true);

        if (collectibleCards.length < PACK_SIZE) {
            throw new NotEnoughCollectibleCardsError();
        }

        const drawnCardIds = drawPackCardsWithoutReplacement(collectibleCards, PACK_SIZE);
        const opened: ApiOpenedPackCard[] = [];

        for (const cardId of drawnCardIds) {
            const { isGolden } = await grantPackCardCopyForUser(userId, cardId, trx);
            const card = collectibleCards.find((entry) => entry.id === cardId)!;
            opened.push({
                ...serializeCatalogCard(card),
                isGolden,
            });
        }

        pack.openedAt = DateTime.now();
        pack.useTransaction(trx);
        await pack.save();

        await updateDailyQuestProgressForPackOpen(userId, 1, trx);

        return opened;
    });

    return openedCards;
};
