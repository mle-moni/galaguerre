import { createSeededRandom } from "#services/daily_quests/seeded_random";
import {
    resetRandomIntInRangeOverride,
    setRandomIntInRangeOverride,
} from "../../app/utils/random.js";

const seededRandomIntInRange = (random: () => number, min: number, max: number): number => {
    const range = max - min + 1;
    return Math.floor(random() * range) + min;
};

export const withRandomIntInRangeOverride = async (
    override: (min: number, max: number) => number,
    fn: () => void | Promise<void>,
): Promise<void> => {
    setRandomIntInRangeOverride(override);
    try {
        await fn();
    } finally {
        resetRandomIntInRangeOverride();
    }
};

export const withSeededRandom = async (
    seed: string,
    fn: () => void | Promise<void>,
): Promise<void> => {
    const random = createSeededRandom(seed);
    await withRandomIntInRangeOverride((min, max) => seededRandomIntInRange(random, min, max), fn);
};
