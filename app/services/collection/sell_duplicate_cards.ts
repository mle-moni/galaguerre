import type { ApiCollectionEntry, ApiDuplicatesPreviewResponse } from "#api_types/collection.types";
import { getGoldCoinsPerDuplicateSell, getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import Card from "#models/card";
import User from "#models/user";
import UserCard from "#models/user_card";
import { getUserCollectionEntries } from "./get_user_collection_counts.js";
import db from "@adonisjs/lucid/services/db";

export class NoDuplicatesToSellError extends Error {
    constructor() {
        super("Aucun doublon à vendre");
        this.name = "NoDuplicatesToSellError";
    }
}

const buildDuplicateSellLines = (
    userCards: UserCard[],
    cardsById: Map<number, Card>,
): ApiDuplicatesPreviewResponse => {
    const lines: ApiDuplicatesPreviewResponse["lines"] = [];

    for (const userCard of userCards) {
        const card = cardsById.get(userCard.cardId);
        if (!card) continue;

        const maxCopies = getMaxCopiesForRarity(card.rarity);
        const excessCount = userCard.count - maxCopies;
        if (excessCount <= 0) continue;

        const goldCoinsPerCopy = getGoldCoinsPerDuplicateSell(card.rarity);
        lines.push({
            cardId: card.id,
            cardLabel: card.data.name,
            rarity: card.rarity,
            excessCount,
            goldCoinsPerCopy,
            goldCoinsTotal: excessCount * goldCoinsPerCopy,
        });
    }

    lines.sort((a, b) => a.cardLabel.localeCompare(b.cardLabel));

    return {
        totalGoldCoins: lines.reduce((sum, line) => sum + line.goldCoinsTotal, 0),
        lines,
    };
};

export const computeDuplicatesSellPreview = async (
    userId: number,
): Promise<ApiDuplicatesPreviewResponse> => {
    const userCards = await UserCard.query().where("userId", userId);
    const cardIds = userCards.map((row) => row.cardId);
    const cards = cardIds.length > 0 ? await Card.query().whereIn("id", cardIds) : [];
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return buildDuplicateSellLines(userCards, cardsById);
};

export const sellAllDuplicateCards = async (
    userId: number,
): Promise<{ goldCoins: number; entries: ApiCollectionEntry[] }> => {
    return db.transaction(async (trx) => {
        const user = await User.query({ client: trx })
            .where("id", userId)
            .forUpdate()
            .firstOrFail();

        const userCards = await UserCard.query({ client: trx }).where("userId", userId);
        const cardIds = userCards.map((row) => row.cardId);
        const cards =
            cardIds.length > 0 ? await Card.query({ client: trx }).whereIn("id", cardIds) : [];
        const cardsById = new Map(cards.map((card) => [card.id, card]));

        const preview = buildDuplicateSellLines(userCards, cardsById);
        if (preview.totalGoldCoins === 0) {
            throw new NoDuplicatesToSellError();
        }

        user.goldCoins += preview.totalGoldCoins;
        user.useTransaction(trx);
        await user.save();

        for (const line of preview.lines) {
            const userCard = userCards.find((row) => row.cardId === line.cardId);
            const card = cardsById.get(line.cardId);
            if (!userCard || !card) continue;

            const maxCopies = getMaxCopiesForRarity(card.rarity);
            userCard.count = maxCopies;
            userCard.goldenCount = Math.min(userCard.goldenCount ?? 0, userCard.count);
            userCard.useTransaction(trx);

            if (userCard.count === 0) {
                await userCard.delete();
            } else {
                await userCard.save();
            }
        }

        return {
            goldCoins: user.goldCoins,
            entries: await getUserCollectionEntries(userId, trx),
        };
    });
};
