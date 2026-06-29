import type { ApiCollectionEntry } from "#api_types/collection.types";
import { getGoldCoinsPerCardBuy, getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import { grantCardCopiesForUser } from "./grant_starter_collection_for_user.js";
import { getUserCollectionEntries } from "./get_user_collection_counts.js";
import db from "@adonisjs/lucid/services/db";

export class NotEnoughGoldCoinsError extends Error {
    constructor(required: number) {
        super(`Il faut ${required} story points pour acheter cette carte.`);
        this.name = "NotEnoughGoldCoinsError";
    }
}

export class CardNotBuyableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CardNotBuyableError";
    }
}

export const buyCardWithGoldCoins = async (
    userId: number,
    cardId: number,
): Promise<{ goldCoins: number; entry: ApiCollectionEntry }> => {
    return db.transaction(async (trx) => {
        const card = await Card.query({ client: trx }).where("id", cardId).first();

        if (!card) {
            throw new CardNotBuyableError("Carte introuvable");
        }

        if (!card.isCollectible) {
            throw new CardNotBuyableError("Cette carte n'est pas achetable");
        }

        const existing = await UserCard.query({ client: trx }).where({ userId, cardId }).first();
        const currentCount = existing?.count ?? 0;
        const maxCopies = getMaxCopiesForRarity(card.rarity);

        if (currentCount >= maxCopies) {
            throw new CardNotBuyableError(
                "Vous possédez déjà le maximum d'exemplaires de cette carte",
            );
        }

        const price = getGoldCoinsPerCardBuy(card.rarity);

        const user = await User.query({ client: trx })
            .where("id", userId)
            .forUpdate()
            .firstOrFail();

        if (user.goldCoins < price) {
            throw new NotEnoughGoldCoinsError(price);
        }

        user.goldCoins -= price;
        user.useTransaction(trx);
        await user.save();

        await grantCardCopiesForUser(userId, cardId, 1, trx);

        const entries = await getUserCollectionEntries(userId, trx);
        const entry = entries.find((row) => row.cardId === cardId);

        if (!entry) {
            throw new Error("Failed to load purchased card entry");
        }

        return {
            goldCoins: user.goldCoins,
            entry,
        };
    });
};
