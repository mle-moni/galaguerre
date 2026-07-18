import type { ApiCollectionEntry } from "#api_types/collection.types";
import { COLLECTION_MIN_CARDS } from "#api_types/collection.types";
import { getGoldCoinsPerDuplicateSell } from "#api_types/card_rarity.types";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import {
    getTotalCollectionCardCount,
    getUserCollectionEntries,
} from "./get_user_collection_counts.js";
import db from "@adonisjs/lucid/services/db";

export class CardNotSellableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CardNotSellableError";
    }
}

export class CollectionTooSmallError extends Error {
    constructor() {
        super(`Vous devez conserver au moins ${COLLECTION_MIN_CARDS} cartes dans votre collection`);
        this.name = "CollectionTooSmallError";
    }
}

export const sellCardWithGoldCoins = async (
    userId: number,
    cardId: number,
): Promise<{ goldCoins: number; entry: ApiCollectionEntry | null }> => {
    return db.transaction(async (trx) => {
        const user = await User.query({ client: trx })
            .where("id", userId)
            .forUpdate()
            .firstOrFail();

        const userCard = await UserCard.query({ client: trx })
            .where({ userId, cardId })
            .forUpdate()
            .first();

        if (!userCard || userCard.count <= 0) {
            throw new CardNotSellableError("Vous ne possédez pas cette carte");
        }

        const totalCollection = await getTotalCollectionCardCount(userId, trx);
        if (totalCollection <= COLLECTION_MIN_CARDS) {
            throw new CollectionTooSmallError();
        }

        const card = await Card.query({ client: trx }).where("id", cardId).firstOrFail();
        const goldEarned = getGoldCoinsPerDuplicateSell(card.rarity);

        user.goldCoins += goldEarned;
        user.useTransaction(trx);
        await user.save();

        userCard.count -= 1;
        if ((userCard.goldenCount ?? 0) > userCard.count) {
            userCard.goldenCount = userCard.count;
        }
        userCard.useTransaction(trx);

        if (userCard.count === 0) {
            await userCard.delete();
        } else {
            await userCard.save();
        }

        const entries = await getUserCollectionEntries(userId, trx);
        const entry = entries.find((row) => row.cardId === cardId) ?? null;

        return {
            goldCoins: user.goldCoins,
            entry,
        };
    });
};
