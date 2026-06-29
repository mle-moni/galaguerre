import { STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import { getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import Card from "#models/card";
import UserCard from "#models/user_card";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

export const grantStarterCollectionForUser = async (
    userId: number,
    client?: TransactionClientContract,
): Promise<void> => {
    for (const { cardId, copies } of STARTER_COLLECTION_RECIPE) {
        const existing = await UserCard.query({ client }).where({ userId, cardId }).first();

        if (existing) {
            existing.count = copies;
            if (client) existing.useTransaction(client);
            await existing.save();
            continue;
        }

        await UserCard.create({ userId, cardId, count: copies }, { client });
    }
};

export const grantCardCopiesForUser = async (
    userId: number,
    cardId: number,
    copiesToAdd: number,
    client?: TransactionClientContract,
): Promise<void> => {
    const card = await Card.query({ client }).where("id", cardId).firstOrFail();
    const maxCopies = getMaxCopiesForRarity(card.rarity);

    const existing = await UserCard.query({ client }).where({ userId, cardId }).first();
    const currentCount = existing?.count ?? 0;
    const newCount = Math.min(currentCount + copiesToAdd, maxCopies);

    if (newCount <= currentCount) return;

    if (existing) {
        existing.count = newCount;
        if (client) existing.useTransaction(client);
        await existing.save();
        return;
    }

    await UserCard.create({ userId, cardId, count: newCount }, { client });
};

export const grantPackCardCopyForUser = async (
    userId: number,
    cardId: number,
    client?: TransactionClientContract,
): Promise<void> => {
    const existing = await UserCard.query({ client }).where({ userId, cardId }).first();

    if (existing) {
        existing.count += 1;
        if (client) existing.useTransaction(client);
        await existing.save();
        return;
    }

    await UserCard.create({ userId, cardId, count: 1 }, { client });
};
