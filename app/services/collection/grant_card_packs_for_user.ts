import CardPack from "#models/card_pack";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

export const grantCardPacksForUser = async (
    userId: number,
    count: number,
    client?: TransactionClientContract,
): Promise<void> => {
    if (count <= 0) return;

    await CardPack.createMany(
        Array.from({ length: count }, () => ({ userId })),
        { client },
    );
};
