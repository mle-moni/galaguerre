import { STARTER_COLLECTION_RECIPE } from "#api_types/collection.types";
import { getMaxCopiesForRarity, getPackGoldenChanceForRarity } from "#api_types/card_rarity.types";
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
            existing.goldenCount = Math.min(existing.goldenCount ?? 0, copies);
            if (client) existing.useTransaction(client);
            await existing.save();
            continue;
        }

        await UserCard.create({ userId, cardId, count: copies, goldenCount: 0 }, { client });
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

    await UserCard.create({ userId, cardId, count: newCount, goldenCount: 0 }, { client });
};

/** Grants a new golden copy (increments both count and goldenCount). */
export const grantGoldenCardCopyForUser = async (
    userId: number,
    cardId: number,
    client?: TransactionClientContract,
): Promise<void> => {
    const card = await Card.query({ client }).where("id", cardId).firstOrFail();
    const maxCopies = getMaxCopiesForRarity(card.rarity);
    const existing = await UserCard.query({ client }).where({ userId, cardId }).first();
    const currentCount = existing?.count ?? 0;

    if (currentCount >= maxCopies) {
        return;
    }

    if (existing) {
        existing.count = currentCount + 1;
        existing.goldenCount = (existing.goldenCount ?? 0) + 1;
        if (client) existing.useTransaction(client);
        await existing.save();
        return;
    }

    await UserCard.create({ userId, cardId, count: 1, goldenCount: 1 }, { client });
};

/** Converts one owned normal copy into a golden copy (goldenCount++ only). */
export const upgradeCardCopyToGoldenForUser = async (
    userId: number,
    cardId: number,
    client?: TransactionClientContract,
): Promise<void> => {
    const existing = await UserCard.query({ client }).where({ userId, cardId }).firstOrFail();
    const currentGoldenCount = existing.goldenCount ?? 0;

    if (currentGoldenCount >= existing.count) {
        return;
    }

    existing.goldenCount = currentGoldenCount + 1;
    if (client) existing.useTransaction(client);
    await existing.save();
};

export type GrantPackCardCopyOptions = {
    forceGolden?: boolean;
    random?: () => number;
};

export const grantPackCardCopyForUser = async (
    userId: number,
    cardId: number,
    client?: TransactionClientContract,
    options: GrantPackCardCopyOptions = {},
): Promise<{ isGolden: boolean }> => {
    const card = await Card.query({ client }).where("id", cardId).firstOrFail();
    const canBeGolden = Boolean(card.data.goldenVideoUrl);
    const roll = options.random?.() ?? Math.random();
    const goldenChance = getPackGoldenChanceForRarity(card.rarity);
    const isGolden = canBeGolden && (options.forceGolden === true || roll < goldenChance);

    const existing = await UserCard.query({ client }).where({ userId, cardId }).first();

    if (existing) {
        existing.count += 1;
        if (isGolden) {
            existing.goldenCount = (existing.goldenCount ?? 0) + 1;
        }
        if (client) existing.useTransaction(client);
        await existing.save();
        return { isGolden };
    }

    await UserCard.create({ userId, cardId, count: 1, goldenCount: isGolden ? 1 : 0 }, { client });
    return { isGolden };
};
