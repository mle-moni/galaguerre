import type { ApiCatalogCard } from "#api_types/deck.types";
import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import { PACK_SIZE } from "#api_types/collection.types";
import { serializeCatalogCard } from "#galaguerre/serialization/serialize_catalog_card";
import Card from "#models/card";
import CardPack from "#models/card_pack";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";
import { drawWeightedPackCardsWithoutReplacement } from "./draw_weighted_pack_cards.js";
import { grantCardCopiesForUser } from "./grant_starter_collection_for_user.js";
import { getUserCollectionCounts } from "./get_user_collection_counts.js";

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

        const eligibleCards = collectibleCards.filter(
            (card) => (ownedCounts.get(card.id) ?? 0) < getMaxCopiesForRarity(card.rarity),
        );

        if (eligibleCards.length < PACK_SIZE) {
            throw new NotEnoughEligibleCardsError();
        }

        const drawnCardIds = drawWeightedPackCardsWithoutReplacement(eligibleCards, PACK_SIZE);

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
