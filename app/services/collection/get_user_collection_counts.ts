import type { ApiCollectionEntry } from "#api_types/collection.types";
import UserCard from "#models/user_card";

export const getUserCollectionCounts = async (userId: number): Promise<Map<number, number>> => {
    const rows = await UserCard.query().where("userId", userId);
    return new Map(rows.map((row) => [row.cardId, row.count]));
};

export const getUserCollectionEntries = async (userId: number): Promise<ApiCollectionEntry[]> => {
    const rows = await UserCard.query().where("userId", userId).where("count", ">", 0);
    return rows.map((row) => ({ cardId: row.cardId, count: row.count }));
};
