import { GOLD_COINS_PER_PACK } from "#api_types/rewards.types";
import RewardsController from "#controllers/rewards/rewards_controller";
import CardPack from "#models/card_pack";
import User from "#models/user";
import {
    buyPackWithGoldCoins,
    NotEnoughGoldCoinsError,
} from "#services/rewards/buy_pack_with_gold_coins";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

const createAuthContext = (user: User) => ({
    auth: { user },
    response: {
        badRequest: (body: unknown) => body,
    },
});

test.group("buy pack", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("buyPackWithGoldCoins deducts gold coins and grants a pack", async ({ assert }) => {
        const user = await User.create({
            email: "buy-pack-ok@test.fr",
            pseudo: "buy-pack-ok",
            password: "test",
            goldCoins: GOLD_COINS_PER_PACK,
        });

        const result = await buyPackWithGoldCoins(user.id);

        assert.equal(result.goldCoins, 0);
        assert.equal(result.unopenedCount, 1);

        await user.refresh();
        assert.equal(user.goldCoins, 0);
    });

    test("buyPackWithGoldCoins rejects when balance is insufficient", async ({ assert }) => {
        const user = await User.create({
            email: "buy-pack-poor@test.fr",
            pseudo: "buy-pack-poor",
            password: "test",
            goldCoins: GOLD_COINS_PER_PACK - 1,
        });

        await assert.rejects(() => buyPackWithGoldCoins(user.id), NotEnoughGoldCoinsError);
    });

    test("RewardsController.buyPack returns updated balance and pack count", async ({ assert }) => {
        const user = await User.create({
            email: "buy-pack-api@test.fr",
            pseudo: "buy-pack-api",
            password: "test",
            goldCoins: GOLD_COINS_PER_PACK * 2,
        });

        const controller = new RewardsController();
        const result = (await controller.buyPack(createAuthContext(user) as never)) as {
            goldCoins: number;
            unopenedCount: number;
        };

        assert.equal(result.goldCoins, GOLD_COINS_PER_PACK);
        assert.equal(result.unopenedCount, 1);

        const packs = await CardPack.query().where("userId", user.id).whereNull("openedAt");
        assert.lengthOf(packs, 1);
    });
});
