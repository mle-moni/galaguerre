import type { ApiCatalogCard } from "#api_types/deck.types";
import { COLLECTION_MAX_COPIES_PER_CARD, PACK_SIZE } from "#api_types/collection.types";
import { serializeCatalogCard } from "#galaguerre/serialization/serialize_catalog_card";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";
import { grantCardCopiesForUser } from "./grant_starter_collection_for_user.js";
import { getUserCollectionCounts } from "./get_user_collection_counts.js";

const shuffleInPlace = <T>(items: T[]): void => {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
};

export class NoUnopenedPackError extends Error {
    constructor() {
        super("Aucun paquet à ouvrir");
        this.name = "NoUnopenedPackError";
    }
}

export class NotEnoughEligibleCardsError extends Error {
    constructor() {
        super("Collection complète : plus assez de cartes éligibles pour ouvrir un paquet");
        this.name = "NotEnoughEligibleCardsError";
    }
}

export const openCardPack = async (userId: number): Promise<ApiCatalogCard[]> => {
    return db.transaction(async (trx) => {
        const pack = await CardPack.query({ client: trx })
            .where("userId", userId)
            .whereNull("openedAt")
            .orderBy("createdAt", "asc")
            .first();

        if (!pack) {
            throw new NoUnopenedPackError();
        }

        const ownedCounts = await getUserCollectionCounts(userId);
        const collectibleCards = await Card.query({ client: trx }).where("isCollectible", true);

        const eligibleCardIds = collectibleCards
            .filter((card) => (ownedCounts.get(card.id) ?? 0) < COLLECTION_MAX_COPIES_PER_CARD)
            .map((card) => card.id);

        if (eligibleCardIds.length < PACK_SIZE) {
            throw new NotEnoughEligibleCardsError();
        }

        shuffleInPlace(eligibleCardIds);
        const drawnCardIds = eligibleCardIds.slice(0, PACK_SIZE);

        for (const cardId of drawnCardIds) {
            await grantCardCopiesForUser(userId, cardId, 1, trx);
        }

        pack.openedAt = DateTime.now();
        pack.useTransaction(trx);
        await pack.save();

        const cardsById = new Map(collectibleCards.map((card) => [card.id, card]));
        return drawnCardIds.map((cardId) => serializeCatalogCard(cardsById.get(cardId)!));
    });
};
