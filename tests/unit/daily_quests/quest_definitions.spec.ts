import {
    pickQuestVariant,
    RANDOM_DAILY_QUEST_DEFINITIONS,
} from "#services/daily_quests/quest_definitions";
import { createSeededRandom } from "#services/daily_quests/seeded_random";
import { test } from "@japa/runner";

test.group("daily quest definitions", () => {
    test("pickQuestVariant favors harder difficulties", ({ assert }) => {
        const definition = RANDOM_DAILY_QUEST_DEFINITIONS.find(
            (entry) => entry.type === "PLAY_MINIONS",
        )!;
        const random = createSeededRandom("difficulty-weight-test");
        const counts = { easy: 0, medium: 0, hard: 0 };

        for (let index = 0; index < 1000; index += 1) {
            const variant = pickQuestVariant(definition.variants, random);
            counts[variant.difficulty] += 1;
        }

        assert.isAbove(counts.hard, counts.easy);
        assert.isAbove(counts.medium, counts.easy);
    });

    test("play minions easy variant requires more than a single game", ({ assert }) => {
        const definition = RANDOM_DAILY_QUEST_DEFINITIONS.find(
            (entry) => entry.type === "PLAY_MINIONS",
        )!;
        const easyVariant = definition.variants.find((variant) => variant.difficulty === "easy")!;

        assert.isAtLeast(easyVariant.target, 15);
        assert.isAtLeast(easyVariant.rewardAmount, 50);
    });
});
