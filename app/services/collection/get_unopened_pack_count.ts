import CardPack from "#models/card_pack";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

export const getUnopenedPackCount = async (
    userId: number,
    client?: TransactionClientContract,
): Promise<number> => {
    const result = await CardPack.query({ client })
        .where("userId", userId)
        .whereNull("openedAt")
        .count("* as total");

    return Number(result[0].$extras.total);
};
