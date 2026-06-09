import { test } from "@japa/runner";
import { shuffleArray } from "../../../app/utils/array.js";
import { randomBoolean } from "../../../app/utils/random.js";

const countElements = <T>(array: T[]): Map<T, number> => {
    const counts = new Map<T, number>();
    for (const value of array) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
};

test.group("shuffleArray", () => {
    test("does not mutate the input array", ({ assert }) => {
        const input = [1, 2, 3, 4];
        const copy = [...input];

        shuffleArray(input);

        assert.deepEqual(input, copy);
    });

    test("preserves length and multiset of elements", ({ assert }) => {
        const input = ["a", "b", "b", "c", "d", "d", "d"];

        const shuffled = shuffleArray(input);

        assert.equal(shuffled.length, input.length);
        assert.deepEqual(countElements(shuffled), countElements(input));
    });

    test("handles empty and single-element arrays", ({ assert }) => {
        assert.deepEqual(shuffleArray([]), []);
        assert.deepEqual(shuffleArray(["only"]), ["only"]);
    });
});

test.group("randomBoolean", () => {
    test("returns roughly balanced values over many calls", ({ assert }) => {
        const sampleSize = 1000;
        let trueCount = 0;

        for (let index = 0; index < sampleSize; index++) {
            if (randomBoolean()) {
                trueCount++;
            }
        }

        const ratio = trueCount / sampleSize;
        assert.isAbove(ratio, 0.4);
        assert.isBelow(ratio, 0.6);
    });
});
