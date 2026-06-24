import RewardsController from "#controllers/rewards/rewards_controller";
import CardPack from "#models/card_pack";
import User from "#models/user";
import {
    claimDailyPack,
    DailyPackAlreadyClaimedError,
    OnboardingNotCompleteError,
} from "#services/rewards/claim_daily_pack";
import {
    getParisCalendarDate,
    parseParisCalendarDate,
} from "#services/rewards/get_paris_calendar_date";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { DateTime } from "luxon";

const createAuthContext = (user: User) => ({
    auth: { user },
    response: {
        badRequest: (body: unknown) => body,
    },
});

test.group("daily pack", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("claimDailyPack grants a pack when onboarding is complete", async ({ assert }) => {
        const user = await User.create({
            email: "daily-pack-ok@test.fr",
            pseudo: "daily-pack-ok",
            password: "test",
            onboardingCompletedAt: DateTime.now(),
        });

        const result = await claimDailyPack(user.id);

        assert.equal(result.unopenedCount, 1);

        await user.refresh();
        assert.equal(user.lastDailyPackClaimedOn?.toISODate(), getParisCalendarDate());
    });

    test("claimDailyPack rejects when onboarding is incomplete", async ({ assert }) => {
        const user = await User.create({
            email: "daily-pack-onboarding@test.fr",
            pseudo: "daily-pack-onboarding",
            password: "test",
        });

        await assert.rejects(() => claimDailyPack(user.id), OnboardingNotCompleteError);
    });

    test("claimDailyPack rejects when already claimed today", async ({ assert }) => {
        const user = await User.create({
            email: "daily-pack-twice@test.fr",
            pseudo: "daily-pack-twice",
            password: "test",
            onboardingCompletedAt: DateTime.now(),
            lastDailyPackClaimedOn: parseParisCalendarDate(getParisCalendarDate()),
        });

        await assert.rejects(() => claimDailyPack(user.id), DailyPackAlreadyClaimedError);
    });

    test("RewardsController.claimDailyPack returns unopened count", async ({ assert }) => {
        const user = await User.create({
            email: "daily-pack-api@test.fr",
            pseudo: "daily-pack-api",
            password: "test",
            onboardingCompletedAt: DateTime.now(),
        });

        const controller = new RewardsController();
        const result = (await controller.claimDailyPack(createAuthContext(user) as never)) as {
            unopenedCount: number;
        };

        assert.equal(result.unopenedCount, 1);

        const packs = await CardPack.query().where("userId", user.id).whereNull("openedAt");
        assert.lengthOf(packs, 1);
    });
});
