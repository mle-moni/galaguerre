import { getProgressionFromTotalXp } from "#api_types/progression";
import User from "#models/user";
import CardPack from "#models/card_pack";
import {
    claimProgressionLevel,
    ProgressionLevelAlreadyClaimedError,
    ProgressionLevelNotClaimableError,
} from "#services/progression/claim_progression_level";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";

test.group("claim progression level", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("level 1 user cannot claim level 1 reward", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `prog-claim-l1-${unique}@test.fr`,
            password: "test",
            xp: 0,
        });

        await assert.rejects(
            () => claimProgressionLevel(user.id, 1),
            ProgressionLevelNotClaimableError,
        );
    });

    test("level 5 user can claim level 4 reward and receives one pack", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `prog-claim-l5-${unique}@test.fr`,
            password: "test",
            xp: getProgressionFromTotalXp(2000).xp,
        });

        assert.equal(getProgressionFromTotalXp(user.xp).level, 5);

        const result = await claimProgressionLevel(user.id, 4);

        assert.equal(result.level, 4);
        assert.equal(result.unopenedCount, 1);

        const packCount = await CardPack.query()
            .where("userId", user.id)
            .whereNull("openedAt")
            .count("* as total");

        assert.equal(Number(packCount[0].$extras.total), 1);
    });

    test("cannot claim the same level twice", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `prog-claim-twice-${unique}@test.fr`,
            password: "test",
            xp: 2000,
        });

        await claimProgressionLevel(user.id, 3);

        await assert.rejects(
            () => claimProgressionLevel(user.id, 3),
            ProgressionLevelAlreadyClaimedError,
        );
    });

    test("cannot claim level equal to or above current level", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `prog-claim-high-${unique}@test.fr`,
            password: "test",
            xp: 2000,
        });

        await assert.rejects(
            () => claimProgressionLevel(user.id, 5),
            ProgressionLevelNotClaimableError,
        );
        await assert.rejects(
            () => claimProgressionLevel(user.id, 6),
            ProgressionLevelNotClaimableError,
        );
    });
});
