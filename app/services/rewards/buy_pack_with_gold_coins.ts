import { GOLD_COINS_PER_PACK } from "#api_types/rewards.types";
import User from "#models/user";
import { grantCardPacksForUser } from "#services/collection/grant_card_packs_for_user";
import { getUnopenedPackCount } from "#services/collection/get_unopened_pack_count";
import db from "@adonisjs/lucid/services/db";

export class NotEnoughGoldCoinsError extends Error {
    constructor() {
        super(`Il faut ${GOLD_COINS_PER_PACK} grains de café pour acheter un paquet.`);
        this.name = "NotEnoughGoldCoinsError";
    }
}

export const buyPackWithGoldCoins = async (
    userId: number,
): Promise<{ goldCoins: number; unopenedCount: number }> => {
    return db.transaction(async (trx) => {
        const user = await User.query({ client: trx })
            .where("id", userId)
            .forUpdate()
            .firstOrFail();

        if (user.goldCoins < GOLD_COINS_PER_PACK) {
            throw new NotEnoughGoldCoinsError();
        }

        user.goldCoins -= GOLD_COINS_PER_PACK;
        user.useTransaction(trx);
        await user.save();

        await grantCardPacksForUser(user.id, 1, trx);

        return {
            goldCoins: user.goldCoins,
            unopenedCount: await getUnopenedPackCount(user.id, trx),
        };
    });
};
