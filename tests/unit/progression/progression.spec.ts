import {
    XP_RANKED_DEFEAT,
    XP_RANKED_VICTORY,
    XP_TRAINING_DEFEAT,
    XP_TRAINING_VICTORY,
    computePlayerXpGain,
    getDefaultProgressionViewStart,
    getProgressionFromTotalXp,
    getProgressionMilestoneLevels,
    getProgressionVisibleLevels,
    isProgressionLevelClaimable,
} from "#api_types/progression";
import { test } from "@japa/runner";

test.group("progression", () => {
    test("computePlayerXpGain returns ranked and training values", ({ assert }) => {
        assert.equal(
            computePlayerXpGain({ isWinner: true, isDraw: false, isTraining: false }),
            XP_RANKED_VICTORY,
        );
        assert.equal(
            computePlayerXpGain({ isWinner: false, isDraw: false, isTraining: false }),
            XP_RANKED_DEFEAT,
        );
        assert.equal(
            computePlayerXpGain({ isWinner: true, isDraw: false, isTraining: true }),
            XP_TRAINING_VICTORY,
        );
        assert.equal(
            computePlayerXpGain({ isWinner: false, isDraw: false, isTraining: true }),
            XP_TRAINING_DEFEAT,
        );
        assert.equal(
            computePlayerXpGain({ isWinner: false, isDraw: true, isTraining: false }),
            XP_RANKED_DEFEAT,
        );
        assert.equal(
            computePlayerXpGain({ isWinner: false, isDraw: true, isTraining: true }),
            XP_TRAINING_DEFEAT,
        );
    });

    test("getProgressionFromTotalXp uses 500 xp per level from 1 to 10", ({ assert }) => {
        assert.deepEqual(getProgressionFromTotalXp(0), {
            xp: 0,
            level: 1,
            levelTitle: "Étincelle",
            xpInLevel: 0,
            xpToNextLevel: 500,
        });

        assert.equal(getProgressionFromTotalXp(499).level, 1);
        assert.equal(getProgressionFromTotalXp(500).level, 2);
        assert.equal(getProgressionFromTotalXp(4500).level, 10);
        assert.equal(getProgressionFromTotalXp(4499).level, 9);
    });

    test("getProgressionFromTotalXp uses 750 xp per level from 10 to 30", ({ assert }) => {
        assert.equal(getProgressionFromTotalXp(4500).level, 10);
        assert.equal(getProgressionFromTotalXp(4500 + 750).level, 11);
        assert.equal(getProgressionFromTotalXp(4500 + 20 * 750).level, 30);
    });

    test("getProgressionFromTotalXp uses 1000 xp per level beyond 30", ({ assert }) => {
        const xpAtLevel30 = 4500 + 20 * 750;
        assert.equal(getProgressionFromTotalXp(xpAtLevel30).level, 30);
        assert.equal(getProgressionFromTotalXp(xpAtLevel30 + 1000).level, 31);
        assert.equal(getProgressionFromTotalXp(xpAtLevel30 + 70 * 1000).level, 100);
    });

    test("getProgressionFromTotalXp caps at level 100", ({ assert }) => {
        const xpAtLevel100 = 4500 + 20 * 750 + 70 * 1000;
        const progression = getProgressionFromTotalXp(xpAtLevel100 + 5000);

        assert.equal(progression.level, 100);
        assert.equal(progression.levelTitle, "Galamage Suprême");
        assert.equal(progression.xpToNextLevel, null);
        assert.equal(progression.xpInLevel, 5000);
    });

    test("getProgressionMilestoneLevels returns bounded window", ({ assert }) => {
        assert.deepEqual(getProgressionMilestoneLevels(1), [1, 2, 3]);
        assert.deepEqual(getProgressionMilestoneLevels(50), [48, 49, 50, 51, 52]);
        assert.deepEqual(getProgressionMilestoneLevels(100), [98, 99, 100]);
    });

    test("isProgressionLevelClaimable requires completed levels only", ({ assert }) => {
        assert.isFalse(isProgressionLevelClaimable(1, 1));
        assert.isTrue(isProgressionLevelClaimable(1, 2));
        assert.isTrue(isProgressionLevelClaimable(4, 5));
        assert.isFalse(isProgressionLevelClaimable(5, 5));
        assert.isFalse(isProgressionLevelClaimable(6, 5));
    });

    test("getProgressionVisibleLevels shows current level plus three ahead", ({ assert }) => {
        assert.deepEqual(getProgressionVisibleLevels(5), [5, 6, 7, 8]);
        assert.deepEqual(getProgressionVisibleLevels(98), [98, 99, 100]);
    });

    test("getDefaultProgressionViewStart anchors on current level", ({ assert }) => {
        assert.equal(getDefaultProgressionViewStart(1), 1);
        assert.equal(getDefaultProgressionViewStart(42), 42);
    });
});
