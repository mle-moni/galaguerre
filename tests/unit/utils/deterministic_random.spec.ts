import { test } from "@japa/runner";
import {
    randomBoolean,
    randomIntInRange,
    resetRandomIntInRangeOverride,
} from "../../../app/utils/random.js";
import {
    withRandomIntInRangeOverride,
    withSeededRandom,
} from "#tests/helpers/deterministic_random";

test.group("deterministic_random", (group) => {
    group.each.teardown(() => {
        resetRandomIntInRangeOverride();
    });

    test("withSeededRandom returns the same sequence for the same seed", async ({ assert }) => {
        const firstRun: number[] = [];

        await withSeededRandom("shared-seed", () => {
            firstRun.push(randomIntInRange(0, 10));
            firstRun.push(randomIntInRange(0, 10));
            firstRun.push(randomIntInRange(3, 7));
        });

        await withSeededRandom("shared-seed", () => {
            assert.equal(randomIntInRange(0, 10), firstRun[0]);
            assert.equal(randomIntInRange(0, 10), firstRun[1]);
            assert.equal(randomIntInRange(3, 7), firstRun[2]);
        });
    });

    test("withSeededRandom resets override after the callback", async ({ assert }) => {
        let seededValue = -1;

        await withSeededRandom("temporary-seed", () => {
            seededValue = randomIntInRange(0, 10);
        });

        await withSeededRandom("temporary-seed", () => {
            assert.equal(randomIntInRange(0, 10), seededValue);
        });

        let overrideApplied = false;
        await withRandomIntInRangeOverride(
            () => 4,
            () => {
                overrideApplied = randomIntInRange(0, 10) === 4;
            },
        );

        assert.isTrue(overrideApplied);
    });

    test("withRandomIntInRangeOverride can force a fixed value", async ({ assert }) => {
        await withRandomIntInRangeOverride(
            () => 2,
            () => {
                assert.equal(randomIntInRange(0, 5), 2);
                assert.equal(randomBoolean(), false);
            },
        );
    });
});
