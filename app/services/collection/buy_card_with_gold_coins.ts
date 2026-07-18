import type { ApiCollectionEntry } from "#api_types/collection.types";
import {
    getGoldCoinsPerCardBuy,
    getGoldCoinsPerGoldenCardBuy,
    getGoldCoinsPerGoldenUpgrade,
    getMaxCopiesForRarity,
} from "#api_types/card_rarity.types";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import {
    grantCardCopiesForUser,
    grantGoldenCardCopyForUser,
    upgradeCardCopyToGoldenForUser,
} from "./grant_starter_collection_for_user.js";
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

export type BuyCardOptions = {
    golden?: boolean;
};

export const buyCardWithGoldCoins = async (
    userId: number,
    cardId: number,
    options: BuyCardOptions = {},
): Promise<{ goldCoins: number; entry: ApiCollectionEntry }> => {
    const buyGolden = options.golden === true;

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
        const currentGoldenCount = existing?.goldenCount ?? 0;
        const maxCopies = getMaxCopiesForRarity(card.rarity);

        let price: number;

        if (buyGolden) {
            if (!card.data.goldenVideoUrl) {
                throw new CardNotBuyableError("Cette carte n'a pas de version golden");
            }

            const canUpgrade = currentCount > currentGoldenCount;
            const canBuyNew = currentCount < maxCopies;

            if (!canUpgrade && !canBuyNew) {
                throw new CardNotBuyableError(
                    "Vous possédez déjà le maximum d'exemplaires golden de cette carte",
                );
            }

            if (canUpgrade) {
                price = getGoldCoinsPerGoldenUpgrade(card.rarity);
            } else {
                price = getGoldCoinsPerGoldenCardBuy(card.rarity);
            }
        } else {
            if (currentCount >= maxCopies) {
                throw new CardNotBuyableError(
                    "Vous possédez déjà le maximum d'exemplaires de cette carte",
                );
            }

            price = getGoldCoinsPerCardBuy(card.rarity);
        }

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

        if (buyGolden) {
            if (currentCount > currentGoldenCount) {
                await upgradeCardCopyToGoldenForUser(userId, cardId, trx);
            } else {
                await grantGoldenCardCopyForUser(userId, cardId, trx);
            }
        } else {
            await grantCardCopiesForUser(userId, cardId, 1, trx);
        }

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
