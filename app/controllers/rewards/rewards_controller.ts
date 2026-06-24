import type { HttpContext } from "@adonisjs/core/http";
import {
    buyPackWithGoldCoins,
    NotEnoughGoldCoinsError,
} from "#services/rewards/buy_pack_with_gold_coins";
import {
    claimDailyPack,
    DailyPackAlreadyClaimedError,
    OnboardingNotCompleteError,
} from "#services/rewards/claim_daily_pack";

export default class RewardsController {
    async claimDailyPack({ auth, response }: HttpContext) {
        try {
            return await claimDailyPack(auth.user!.id);
        } catch (error) {
            if (error instanceof OnboardingNotCompleteError) {
                return response.badRequest({ error: error.message });
            }

            if (error instanceof DailyPackAlreadyClaimedError) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }

    async buyPack({ auth, response }: HttpContext) {
        try {
            return await buyPackWithGoldCoins(auth.user!.id);
        } catch (error) {
            if (error instanceof NotEnoughGoldCoinsError) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }
}
