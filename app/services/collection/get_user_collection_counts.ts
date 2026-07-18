import type { ApiCollectionEntry } from "#api_types/collection.types";
import UserCard from "#models/user_card";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

export const getUserCollectionCounts = async (userId: number): Promise<Map<number, number>> => {
    const rows = await UserCard.query().where("userId", userId);
    return new Map(rows.map((row) => [row.cardId, row.count]));
};

export const getUserCollectionGoldenCounts = async (
    userId: number,
): Promise<Map<number, number>> => {
    const rows = await UserCard.query().where("userId", userId);
    return new Map(rows.map((row) => [row.cardId, row.goldenCount ?? 0]));
};

export const getUserCollectionEntries = async (
    userId: number,
    client?: TransactionClientContract,
): Promise<ApiCollectionEntry[]> => {
    const rows = await UserCard.query({ client }).where("userId", userId).where("count", ">", 0);
    return rows.map((row) => ({
        cardId: row.cardId,
        count: row.count,
        goldenCount: row.goldenCount ?? 0,
    }));
};

export const getTotalCollectionCardCount = async (
    userId: number,
    client?: TransactionClientContract,
): Promise<number> => {
    const rows = await UserCard.query({ client }).where("userId", userId);
    return rows.reduce((sum, row) => sum + row.count, 0);
};
